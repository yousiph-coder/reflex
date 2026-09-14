"""
Incident worker — the closed-loop remediation pipeline.

Orchestrates the full lifecycle of an incident from PENDING through
RESOLVED or FAILED:

1. Transition to ANALYZING — fetch source context and blame from GitHub.
2. Generate remediation — call the LLM agent orchestrator.
3. Validate in sandbox — apply patches in a Docker container and run tests.
4. Retry loop — if sandbox fails, feed errors back to the LLM (max 2 retries).
5. Open PR — if sandbox passes, create a GitHub branch + PR.
6. Notify — send Slack / Discord alerts.
7. Persist — update the ``incidents`` and ``remediation_attempts`` tables.

The worker is a plain async function suitable for direct invocation,
``asyncio.create_task()``, or integration with a task queue (ARQ, Celery,
Dramatiq, etc.).
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_session_factory
from app.models.incident import (
    Incident,
    IncidentStatus,
    RemediationAttempt,
    RemediationStatus,
)
from app.schemas.remediation import (
    BlameInfo,
    FileContext,
    FilePatch,
    IncidentContext,
    RemediationOutput,
    RetryContext,
    SandboxResult,
)
from app.services.agent_orchestrator import AgentOrchestrator
from app.services.github_service import GitHubService
from app.services.notification import NotificationDispatcher
from app.services.sandbox_runner import SandboxRunner

logger = logging.getLogger(__name__)

_MAX_SANDBOX_RETRIES = 2  # LLM re-generation attempts after sandbox failure
_CONFIDENCE_THRESHOLD = 0.15  # Minimum confidence to proceed with sandbox


class IncidentWorker:
    """Self-contained closed-loop remediation worker.

    Usage::

        worker = IncidentWorker(
            github=github_svc,
            orchestrator=agent_orch,
            sandbox=sandbox_runner,
            notifier=notifier,
        )
        await worker.process_incident(incident_id)

    Or as a one-shot factory::

        await IncidentWorker.run(incident_id)
    """

    def __init__(
        self,
        *,
        github: GitHubService,
        orchestrator: AgentOrchestrator,
        sandbox: SandboxRunner,
        notifier: NotificationDispatcher,
        slack_webhook_url: str | None = None,
        discord_webhook_url: str | None = None,
    ) -> None:
        self._github = github
        self._orchestrator = orchestrator
        self._sandbox = sandbox
        self._notifier = notifier

    # ── One-shot factory ────────────────────────────────────────

    @classmethod
    async def run(
        cls,
        incident_id: uuid.UUID,
        *,
        slack_webhook_url: str | None = None,
        discord_webhook_url: str | None = None,
    ) -> None:
        """Convenience entry point that creates all services, runs the
        pipeline, and tears everything down.
        """
        settings = get_settings()

        github = GitHubService()
        orchestrator = AgentOrchestrator()
        sandbox = SandboxRunner()
        notifier = NotificationDispatcher(
            slack_webhook_url=slack_webhook_url,
            discord_webhook_url=discord_webhook_url,
        )

        try:
            await github.init()
            await orchestrator.init()

            worker = cls(
                github=github,
                orchestrator=orchestrator,
                sandbox=sandbox,
                notifier=notifier,
            )
            await worker.process_incident(incident_id)
        finally:
            await notifier.close()
            await sandbox.close()
            await orchestrator.close()
            await github.close()

    # ═════════════════════════════════════════════════════════════
    # Main pipeline
    # ═════════════════════════════════════════════════════════════

    async def process_incident(self, incident_id: uuid.UUID) -> None:
        """Execute the full remediation pipeline for one incident."""
        pipeline_start = time.monotonic()
        settings = get_settings()
        session_factory = get_session_factory()

        async with session_factory() as db:
            # ── Load incident ───────────────────────────────────
            incident = await self._load_incident(db, incident_id)
            if incident is None:
                logger.error("Incident %s not found — aborting", incident_id)
                return

            if incident.status != IncidentStatus.PENDING:
                logger.info(
                    "Incident %s is %s (not PENDING) — skipping",
                    incident_id,
                    incident.status.value,
                )
                return

            logger.info(
                "▶ Starting remediation pipeline for incident %s: %s",
                incident_id,
                incident.title,
            )

            try:
                # ─────────────────────────────────────────────────
                # STEP 1: ANALYZING — fetch context from GitHub
                # ─────────────────────────────────────────────────
                await self._update_status(db, incident, IncidentStatus.ANALYZING)

                file_contexts, blame_info = await self._fetch_context(incident)

                context = IncidentContext(
                    incident_id=str(incident.id),
                    sentry_issue_id=incident.sentry_issue_id,
                    title=incident.title,
                    error_type=incident.error_type,
                    error_message=incident.error_message or "",
                    stack_trace=incident.stack_trace or "",
                    file_path=incident.file_path,
                    function_name=incident.function_name,
                    line_number=incident.line_number,
                    environment=incident.environment,
                    platform=incident.platform,
                    level=incident.level,
                    file_contexts=file_contexts,
                    blame_info=blame_info,
                    repo_owner=settings.github_owner,
                    repo_name=settings.github_repo,
                    default_branch=settings.github_default_branch,
                )

                # ─────────────────────────────────────────────────
                # STEP 2: REMEDIATING — LLM + sandbox loop
                # ─────────────────────────────────────────────────
                await self._update_status(db, incident, IncidentStatus.REMEDIATING)

                remediation, sandbox_result, attempt_record = (
                    await self._remediation_loop(db, incident, context)
                )

                if remediation is None or sandbox_result is None or not sandbox_result.success:
                    # ── All retries exhausted — FAILED ──────────
                    await self._update_status(db, incident, IncidentStatus.FAILED)
                    incident.retry_count = _MAX_SANDBOX_RETRIES + 1
                    await db.commit()

                    await self._notify_failure(
                        incident=incident,
                        reason=(
                            sandbox_result.truncated_output(500)
                            if sandbox_result
                            else "LLM failed to produce valid output"
                        ),
                    )
                    return

                # ─────────────────────────────────────────────────
                # STEP 3: Open GitHub PR
                # ─────────────────────────────────────────────────
                pr_result = await self._create_pr(
                    incident=incident,
                    remediation=remediation,
                )

                # Update the attempt record with PR info
                if attempt_record and pr_result:
                    attempt_record.pr_url = pr_result.get("pr_url", "")
                    attempt_record.pr_number = pr_result.get("pr_number")
                    attempt_record.branch_name = pr_result.get("branch_name", "")
                    attempt_record.status = RemediationStatus.PR_OPENED

                # ─────────────────────────────────────────────────
                # STEP 4: RESOLVED
                # ─────────────────────────────────────────────────
                await self._update_status(db, incident, IncidentStatus.RESOLVED)
                await db.commit()

                # ─────────────────────────────────────────────────
                # STEP 5: Notify
                # ─────────────────────────────────────────────────
                await self._notify_success(
                    incident=incident,
                    remediation=remediation,
                    pr_result=pr_result or {},
                )

                elapsed = time.monotonic() - pipeline_start
                logger.info(
                    "✅ Incident %s resolved in %.1fs — PR: %s",
                    incident_id,
                    elapsed,
                    (pr_result or {}).get("pr_url", "N/A"),
                )

            except Exception as exc:
                logger.error(
                    "❌ Pipeline failed for incident %s: %s",
                    incident_id,
                    exc,
                    exc_info=True,
                )
                await self._update_status(db, incident, IncidentStatus.FAILED)
                await db.commit()

                await self._notify_failure(
                    incident=incident,
                    reason=str(exc)[:500],
                )

    # ═════════════════════════════════════════════════════════════
    # Pipeline steps
    # ═════════════════════════════════════════════════════════════

    async def _fetch_context(
        self,
        incident: Incident,
    ) -> tuple[list[FileContext], BlameInfo | None]:
        """Fetch file content and blame info from GitHub."""
        file_contexts: list[FileContext] = []
        blame_info: BlameInfo | None = None

        if incident.file_path:
            # Fetch the primary file with context window
            fc = await self._github.fetch_file_context(
                incident.file_path,
                line_number=incident.line_number,
                context_lines=50,
            )
            file_contexts.append(fc)

            # Fetch blame data
            blame_info = await self._github.fetch_recent_blame_and_diff(
                incident.file_path,
                line_start=(
                    max(1, incident.line_number - 20) if incident.line_number else None
                ),
                line_end=(
                    incident.line_number + 20 if incident.line_number else None
                ),
            )

        # If the stack trace mentions other files, fetch them too
        if incident.stack_trace:
            extra_files = self._extract_files_from_trace(incident.stack_trace)
            for fpath in extra_files[:3]:  # Limit to 3 extra files
                if fpath != incident.file_path:
                    try:
                        fc = await self._github.fetch_file_context(fpath)
                        file_contexts.append(fc)
                    except Exception as exc:
                        logger.debug("Could not fetch %s: %s", fpath, exc)

        logger.info(
            "Fetched %d file context(s) for incident %s",
            len(file_contexts),
            incident.id,
        )
        return file_contexts, blame_info

    async def _remediation_loop(
        self,
        db: AsyncSession,
        incident: Incident,
        context: IncidentContext,
    ) -> tuple[RemediationOutput | None, SandboxResult | None, RemediationAttempt | None]:
        """Run the LLM → sandbox → retry feedback loop.

        Returns the final remediation output, sandbox result, and DB attempt
        record.  All three are ``None`` if every attempt failed.
        """
        last_remediation: RemediationOutput | None = None
        last_sandbox: SandboxResult | None = None
        last_attempt: RemediationAttempt | None = None

        for attempt_num in range(1, _MAX_SANDBOX_RETRIES + 2):  # 1-indexed, inclusive
            logger.info(
                "Remediation attempt %d/%d for incident %s",
                attempt_num,
                _MAX_SANDBOX_RETRIES + 1,
                incident.id,
            )

            # ── Generate fix ────────────────────────────────────
            try:
                remediation, token_usage = (
                    await self._orchestrator.generate_remediation(context)
                )
            except Exception as exc:
                logger.error(
                    "LLM generation failed (attempt %d): %s",
                    attempt_num,
                    exc,
                )
                last_attempt = await self._record_attempt(
                    db,
                    incident=incident,
                    attempt_num=attempt_num,
                    strategy="llm_generation_failed",
                    status=RemediationStatus.FAILED,
                    error_message=str(exc),
                    token_usage={},
                )
                break

            last_remediation = remediation

            # ── Confidence gate ─────────────────────────────────
            if remediation.confidence_score < _CONFIDENCE_THRESHOLD:
                logger.warning(
                    "Confidence %.2f below threshold %.2f — skipping sandbox",
                    remediation.confidence_score,
                    _CONFIDENCE_THRESHOLD,
                )
                last_attempt = await self._record_attempt(
                    db,
                    incident=incident,
                    attempt_num=attempt_num,
                    strategy="low_confidence_skip",
                    status=RemediationStatus.FAILED,
                    remediation=remediation,
                    token_usage=token_usage,
                    error_message=(
                        f"Confidence {remediation.confidence_score:.2f} "
                        f"below threshold {_CONFIDENCE_THRESHOLD}"
                    ),
                )
                break

            # ── Fetch original files for sandbox ────────────────
            original_files: dict[str, str] = {}
            for patch in remediation.file_patches:
                if patch.action.value != "create":
                    try:
                        content = await self._github.fetch_full_file(patch.file_path)
                        original_files[patch.file_path] = content
                    except FileNotFoundError:
                        logger.warning(
                            "File %s not found in repo — patch may fail",
                            patch.file_path,
                        )

            # ── Run sandbox ─────────────────────────────────────
            sandbox_result = await self._sandbox.validate_patch(
                file_patches=remediation.file_patches,
                unit_test=remediation.unit_test,
                original_files=original_files,
            )
            last_sandbox = sandbox_result

            if sandbox_result.success:
                # ✅ Tests passed — record and return
                last_attempt = await self._record_attempt(
                    db,
                    incident=incident,
                    attempt_num=attempt_num,
                    strategy="automated_fix",
                    status=RemediationStatus.IN_PROGRESS,  # will become PR_OPENED later
                    remediation=remediation,
                    token_usage=token_usage,
                    sandbox_duration=sandbox_result.duration_seconds,
                )
                logger.info(
                    "✅ Sandbox PASSED on attempt %d (%.1fs)",
                    attempt_num,
                    sandbox_result.duration_seconds,
                )
                return remediation, sandbox_result, last_attempt

            # ── Sandbox failed — prepare retry context ──────────
            logger.warning(
                "Sandbox FAILED on attempt %d (exit=%d): %s",
                attempt_num,
                sandbox_result.exit_code,
                sandbox_result.stderr[:300] if sandbox_result.stderr else "(no stderr)",
            )

            last_attempt = await self._record_attempt(
                db,
                incident=incident,
                attempt_num=attempt_num,
                strategy="automated_fix",
                status=RemediationStatus.FAILED,
                remediation=remediation,
                token_usage=token_usage,
                sandbox_duration=sandbox_result.duration_seconds,
                error_message=sandbox_result.truncated_output(1000),
            )

            # Inject feedback for the next LLM call
            if attempt_num <= _MAX_SANDBOX_RETRIES:
                context.retry_context = RetryContext(
                    attempt_number=attempt_num,
                    previous_patch=remediation,
                    sandbox_result=sandbox_result,
                )
                incident.retry_count = attempt_num
                await db.commit()

        return last_remediation, last_sandbox, last_attempt

    async def _create_pr(
        self,
        *,
        incident: Incident,
        remediation: RemediationOutput,
    ) -> dict[str, Any] | None:
        """Create a GitHub PR with the validated patches."""
        branch_name = (
            f"autoheal/{incident.sentry_issue_id[:20]}-"
            f"{uuid.uuid4().hex[:8]}"
        )
        pr_title = f"[Auto-Heal] Fix {incident.error_type}: {incident.title}"
        if len(pr_title) > 256:
            pr_title = pr_title[:253] + "…"

        # Build the full patched file contents for the PR commit
        file_patches_for_pr: list[dict[str, str]] = []
        for patch in remediation.file_patches:
            if patch.action.value == "create":
                file_patches_for_pr.append({
                    "file_path": patch.file_path,
                    "content": patch.replace_block,
                })
            elif patch.action.value == "modify":
                try:
                    original = await self._github.fetch_full_file(patch.file_path)
                    patched_content = original.replace(
                        patch.search_block, patch.replace_block, 1,
                    )
                    file_patches_for_pr.append({
                        "file_path": patch.file_path,
                        "content": patched_content,
                    })
                except Exception as exc:
                    logger.error(
                        "Failed to fetch %s for PR: %s", patch.file_path, exc,
                    )
                    return None

        try:
            pr_result = await self._github.create_remediation_pr(
                branch_name=branch_name,
                file_patches=file_patches_for_pr,
                unit_test_code=remediation.unit_test.test_code,
                unit_test_path=remediation.unit_test.test_file_path,
                pr_title=pr_title,
                pr_body=remediation.to_pr_body(),
            )
            return pr_result
        except Exception as exc:
            logger.error("PR creation failed: %s", exc, exc_info=True)
            return None

    # ═════════════════════════════════════════════════════════════
    # DB helpers
    # ═════════════════════════════════════════════════════════════

    @staticmethod
    async def _load_incident(
        db: AsyncSession,
        incident_id: uuid.UUID,
    ) -> Incident | None:
        result = await db.execute(
            select(Incident).where(Incident.id == incident_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def _update_status(
        db: AsyncSession,
        incident: Incident,
        status: IncidentStatus,
    ) -> None:
        incident.status = status
        incident.updated_at = datetime.now(timezone.utc)
        await db.commit()
        logger.info("Incident %s → %s", incident.id, status.value)

    async def _record_attempt(
        self,
        db: AsyncSession,
        *,
        incident: Incident,
        attempt_num: int,
        strategy: str,
        status: RemediationStatus,
        remediation: RemediationOutput | None = None,
        token_usage: dict[str, int] | None = None,
        sandbox_duration: float | None = None,
        error_message: str | None = None,
    ) -> RemediationAttempt:
        """Persist a ``RemediationAttempt`` row."""
        settings = get_settings()
        usage = token_usage or {}

        attempt = RemediationAttempt(
            organization_id=incident.organization_id,
            incident_id=incident.id,
            strategy=strategy,
            analysis=(
                remediation.root_cause_analysis if remediation else None
            ),
            diff=(
                self._patches_to_diff(remediation.file_patches)
                if remediation
                else None
            ),
            status=status,
            llm_model=settings.llm_model,
            llm_provider=self._infer_provider(settings.llm_base_url),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            duration_seconds=sandbox_duration,
            error_message=error_message,
        )
        db.add(attempt)
        await db.flush()
        logger.debug(
            "Recorded attempt %s (#%d, strategy=%s, status=%s)",
            attempt.id,
            attempt_num,
            strategy,
            status.value,
        )
        return attempt

    # ═════════════════════════════════════════════════════════════
    # Notifications
    # ═════════════════════════════════════════════════════════════

    async def _notify_success(
        self,
        *,
        incident: Incident,
        remediation: RemediationOutput,
        pr_result: dict[str, Any],
    ) -> None:
        try:
            await self._notifier.notify_pr_opened(
                incident_id=str(incident.id),
                title=incident.title,
                pr_url=pr_result.get("pr_url", ""),
                pr_number=pr_result.get("pr_number"),
                confidence=remediation.confidence_score,
                post_mortem=remediation.post_mortem_summary,
            )
        except Exception as exc:
            logger.warning("Success notification failed: %s", exc)

    async def _notify_failure(
        self,
        *,
        incident: Incident,
        reason: str,
    ) -> None:
        try:
            await self._notifier.notify_remediation_failed(
                incident_id=str(incident.id),
                title=incident.title,
                reason=reason,
                attempts=incident.retry_count + 1,
            )
        except Exception as exc:
            logger.warning("Failure notification failed: %s", exc)

    # ═════════════════════════════════════════════════════════════
    # Utility
    # ═════════════════════════════════════════════════════════════

    @staticmethod
    def _patches_to_diff(patches: list[FilePatch]) -> str:
        """Convert a list of ``FilePatch`` objects to a unified-diff-like string."""
        parts: list[str] = []
        for p in patches:
            parts.append(f"--- a/{p.file_path}")
            parts.append(f"+++ b/{p.file_path}")
            if p.action.value == "create":
                for line in p.replace_block.splitlines():
                    parts.append(f"+{line}")
            elif p.action.value == "delete":
                for line in p.search_block.splitlines():
                    parts.append(f"-{line}")
            else:
                for line in p.search_block.splitlines():
                    parts.append(f"-{line}")
                for line in p.replace_block.splitlines():
                    parts.append(f"+{line}")
            parts.append("")
        return "\n".join(parts)

    @staticmethod
    def _extract_files_from_trace(stack_trace: str) -> list[str]:
        """Extract file paths from a stack trace string.

        Looks for patterns like ``File "some/path.py"`` which is the
        standard Python traceback format.
        """
        import re

        pattern = re.compile(r'File\s+"([^"]+)"')
        matches = pattern.findall(stack_trace)

        # Deduplicate while preserving order, filter out stdlib / venv paths
        seen: set[str] = set()
        result: list[str] = []
        exclude_prefixes = (
            "/usr/", "/lib/", "/opt/", "site-packages/", "<", "venv/", ".venv/",
        )
        for path in matches:
            normalised = path.lstrip("/").replace("\\", "/")
            if normalised in seen:
                continue
            if any(normalised.startswith(pre) or pre in normalised for pre in exclude_prefixes):
                continue
            seen.add(normalised)
            result.append(normalised)
        return result

    @staticmethod
    def _infer_provider(base_url: str) -> str:
        """Guess the LLM provider from the base URL."""
        url = base_url.lower()
        if "openai" in url:
            return "openai"
        if "anthropic" in url:
            return "anthropic"
        if "google" in url or "vertex" in url or "generativelanguage" in url:
            return "google"
        if "azure" in url:
            return "azure_openai"
        if "mistral" in url:
            return "mistral"
        if "groq" in url:
            return "groq"
        if "together" in url:
            return "together"
        if "localhost" in url or "127.0.0.1" in url:
            return "local"
        return "unknown"


# ── Asyncio task launcher ──────────────────────────────────────

async def enqueue_incident(incident_id: uuid.UUID) -> asyncio.Task:
    """Fire-and-forget launcher for the remediation pipeline.

    Creates an ``asyncio.Task`` that runs ``IncidentWorker.run()``
    in the background.  Suitable for calling from the webhook
    endpoint once a task-queue integration is not yet in place.

    The returned task can be awaited or cancelled if needed.
    """
    task = asyncio.create_task(
        IncidentWorker.run(incident_id),
        name=f"remediate-{incident_id}",
    )

    def _on_done(t: asyncio.Task) -> None:
        if t.cancelled():
            logger.info("Remediation task for %s was cancelled", incident_id)
        elif t.exception():
            logger.error(
                "Remediation task for %s raised: %s",
                incident_id,
                t.exception(),
            )
        else:
            logger.info("Remediation task for %s completed", incident_id)

    task.add_done_callback(_on_done)
    return task


# ── Standalone Worker Poller for Production (Render / Docker) ────

async def start_worker_loop(poll_interval_seconds: float = 3.0) -> None:
    """Run continuous polling loop to pick up and process PENDING incidents."""
    from app.database import close_db, init_db

    logger.info("Initializing AutoHeal Incident Worker daemon...")
    await init_db()

    stop_event = asyncio.Event()

    # Handle signals gracefully if supported by platform
    try:
        import signal
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, stop_event.set)
            except NotImplementedError:
                # Windows doesn't support add_signal_handler
                pass
    except Exception:
        pass

    logger.info("Incident Worker started. Polling for PENDING incidents (interval: %ss)...", poll_interval_seconds)

    try:
        while not stop_event.is_set():
            try:
                factory = get_session_factory()
                async with factory() as session:
                    # Select next PENDING incident
                    stmt = (
                        select(Incident.id)
                        .where(Incident.status == IncidentStatus.PENDING)
                        .order_by(Incident.created_at.asc())
                        .limit(1)
                    )
                    res = await session.execute(stmt)
                    incident_id = res.scalar_one_or_none()

                if incident_id:
                    logger.info("Claimed incident %s for remediation", incident_id)
                    await IncidentWorker.run(incident_id)
                else:
                    await asyncio.sleep(poll_interval_seconds)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Error in incident worker loop: %s", exc, exc_info=True)
                await asyncio.sleep(poll_interval_seconds)

    finally:
        logger.info("Shutting down AutoHeal Incident Worker...")
        await close_db()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    try:
        asyncio.run(start_worker_loop())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Worker stopped by user.")

