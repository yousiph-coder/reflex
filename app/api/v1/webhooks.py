"""
Sentry webhook endpoint.

POST /api/v1/webhooks/sentry

Receives Sentry alert-rule webhook payloads, validates the HMAC-SHA256
signature, parses and scrubs the event, deduplicates via Redis, persists
a new ``Incident`` row as PENDING, and returns 202 Accepted.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.deduplicator import IncidentDeduplicator, get_redis
from app.core.scrubber import SecretScrubber
from app.database import get_db_session
from app.models.incident import (
    Incident,
    IncidentStatus,
    RemediationAttempt,
    RemediationStatus,
)
from app.services.github_service import GitHubService
from app.schemas.sentry import (
    InternalIncidentEvent,
    SentryWebhookPayload,
    WebhookAckResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Module-level scrubber — stateless, safe to share.
_scrubber = SecretScrubber()


# ── Helpers ─────────────────────────────────────────────────────

def _verify_sentry_signature(
    body: bytes,
    signature: str,
    secret: str,
) -> bool:
    """Verify Sentry's HMAC-SHA256 request signature.

    Sentry computes ``HMAC-SHA256(client_secret, raw_body)`` and sends
    the hex digest in the ``sentry-hook-signature`` header.
    """
    expected = hmac.new(
        key=secret.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _extract_issue_id(payload: SentryWebhookPayload) -> str:
    """Derive a stable issue identifier from the webhook payload.

    Tries the event ID first, then falls back to a UUID.
    """
    event = payload.data.event
    if event and event.event_id:
        return event.event_id
    return str(uuid.uuid4())


# ── Endpoint ────────────────────────────────────────────────────

@router.post(
    "/sentry",
    response_model=WebhookAckResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Receive a Sentry alert webhook",
    description=(
        "Validates the Sentry HMAC signature, scrubs secrets from the "
        "payload, deduplicates via Redis, and persists the incident."
    ),
)
async def sentry_webhook(
    request: Request,
    sentry_hook_signature: str = Header(
        ...,
        alias="sentry-hook-signature",
        description="HMAC-SHA256 hex digest from Sentry",
    ),
    sentry_hook_resource: str = Header(
        default="event_alert",
        alias="sentry-hook-resource",
        description="Sentry resource type",
    ),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> WebhookAckResponse:
    """Process an inbound Sentry webhook."""

    # 1. Read raw body for signature verification
    raw_body: bytes = await request.body()

    # 2. Verify HMAC-SHA256 signature
    if not _verify_sentry_signature(
        body=raw_body,
        signature=sentry_hook_signature,
        secret=settings.sentry_client_secret.get_secret_value(),
    ):
        logger.warning("Sentry webhook signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    # 3. Parse the JSON payload
    try:
        raw_json: dict[str, Any] = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        logger.error("Malformed JSON in Sentry webhook: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON payload",
        ) from exc

    # 4. Validate against Pydantic schema
    try:
        payload = SentryWebhookPayload.model_validate(raw_json)
    except Exception as exc:
        logger.error("Sentry payload validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Payload validation error: {exc}",
        ) from exc

    # 5. Guard: we only process 'triggered' actions with event data
    if payload.action != "triggered" or payload.data.event is None:
        logger.info(
            "Ignoring Sentry webhook action=%s (no event data or non-trigger)",
            payload.action,
        )
        return WebhookAckResponse(
            status="ignored",
            message=f"Action '{payload.action}' does not require processing",
        )

    event = payload.data.event

    # 6. Extract error metadata
    primary_exc = event.get_primary_exception()
    top_frame = event.get_top_in_app_frame()

    error_type = (primary_exc.type if primary_exc else None) or "UnknownError"
    error_message = (primary_exc.value if primary_exc else None) or event.message or ""
    file_path = (top_frame.filename or top_frame.abs_path) if top_frame else None
    function_name = top_frame.function if top_frame else None
    line_number = top_frame.lineno if top_frame else None
    sentry_issue_id = _extract_issue_id(payload)

    # 7. Scrub secrets from text fields
    stack_trace_raw = event.build_stack_trace_text()
    stack_trace = _scrubber.scrub(stack_trace_raw)
    error_message = _scrubber.scrub(error_message)
    title = _scrubber.scrub(event.title or error_type)

    # Scrub the raw JSON blob for storage
    scrubbed_raw_event = _scrubber.scrub_dict(raw_json)

    # 8. Compute dedup fingerprint
    fingerprint = IncidentDeduplicator.fingerprint(
        sentry_issue_id=sentry_issue_id,
        file_path=file_path,
        error_type=error_type,
    )

    # 9. Check Redis dedup lock
    redis = get_redis()
    dedup = IncidentDeduplicator(redis)
    is_new = await dedup.is_new(fingerprint)

    if not is_new:
        logger.info(
            "Duplicate incident suppressed (fingerprint=%s)",
            fingerprint[:16],
        )
        return WebhookAckResponse(
            status="deduplicated",
            deduplicated=True,
            message="Duplicate event within debounce window",
        )

    # 10. Resolve tenant organization and persist incident to PostgreSQL
    from app.core.security import hash_api_key
    from app.models.organization import APIKey, Organization

    x_api_key = request.headers.get("X-API-Key")
    org_id = None
    if x_api_key:
        hashed = hash_api_key(x_api_key.strip())
        org_stmt = select(APIKey.organization_id).where(APIKey.hashed_key == hashed, APIKey.is_active == True)
        res = await db.execute(org_stmt)
        org_id = res.scalar_one_or_none()

    if org_id is None:
        default_org_res = await db.execute(select(Organization.id).order_by(Organization.created_at.asc()).limit(1))
        org_id = default_org_res.scalar_one_or_none()

    if org_id is None:
        default_org = Organization(name="Default Organization", slug="default-org")
        db.add(default_org)
        await db.flush()
        org_id = default_org.id

    incident = Incident(
        organization_id=org_id,
        sentry_issue_id=sentry_issue_id,
        sentry_event_id=event.event_id,
        fingerprint=fingerprint,
        title=title,
        error_type=error_type,
        error_message=error_message,
        file_path=file_path,
        function_name=function_name,
        line_number=line_number,
        stack_trace=stack_trace,
        raw_event=scrubbed_raw_event,
        project_slug=None,  # Sentry project slug is in the installation context
        environment=event.environment,
        platform=event.platform,
        level=event.level,
        status=IncidentStatus.PENDING,
    )
    db.add(incident)
    await db.commit()  # Commit so background worker can query it immediately

    logger.info(
        "Incident created: id=%s fingerprint=%s error_type=%s",
        incident.id,
        fingerprint[:16],
        error_type,
    )

    # 11. Build internal event for downstream worker enqueue
    internal_event = InternalIncidentEvent(
        incident_id=incident.id,
        sentry_issue_id=sentry_issue_id,
        sentry_event_id=event.event_id,
        fingerprint=fingerprint,
        title=title,
        error_type=error_type,
        error_message=error_message,
        file_path=file_path,
        function_name=function_name,
        line_number=line_number,
        stack_trace=stack_trace,
        environment=event.environment,
        platform=event.platform,
        level=event.level,
    )

    # 11. Enqueue closed-loop remediation worker
    try:
        from app.workers.incident_worker import enqueue_incident
        await enqueue_incident(incident.id)
        logger.info("Incident %s successfully enqueued for autonomous remediation pipeline.", incident.id)
    except Exception as exc:
        logger.error("Failed to enqueue incident %s: %s", incident.id, exc)

    # 12. Return 202 Accepted
    return WebhookAckResponse(
        status="accepted",
        incident_id=incident.id,
        deduplicated=False,
        message="Incident created and queued for analysis",
    )


# ── GitHub Webhook Endpoint ─────────────────────────────────────

@router.post(
    "/github",
    status_code=status.HTTP_200_OK,
    summary="Receive a GitHub App webhook event",
    description=(
        "Validates GitHub HMAC-SHA256 signature (X-Hub-Signature-256) and "
        "processes App lifecycle events such as installation and pull request merge."
    ),
)
async def github_webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(
        default=None,
        alias="x-hub-signature-256",
        description="HMAC-SHA256 signature from GitHub",
    ),
    x_github_event: str = Header(
        default="ping",
        alias="x-github-event",
        description="GitHub event name",
    ),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Process an inbound GitHub App webhook event."""
    raw_body: bytes = await request.body()

    # 1. Enforce HMAC-SHA256 signature verification if secret is configured
    secret = (
        settings.github_webhook_secret.get_secret_value()
        if settings.github_webhook_secret
        else None
    )
    if secret:
        if not GitHubService.verify_webhook_signature(
            payload_body=raw_body,
            signature_header=x_hub_signature_256,
            secret=secret,
        ):
            logger.warning("GitHub webhook signature verification failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid GitHub webhook signature",
            )
    else:
        logger.debug("Skipping GitHub webhook signature check: GITHUB_WEBHOOK_SECRET not set")

    # 2. Parse JSON payload
    try:
        payload: dict[str, Any] = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception as exc:
        logger.error("Malformed JSON in GitHub webhook: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON payload: {exc}",
        ) from exc

    action = payload.get("action", "")
    logger.info("Received GitHub webhook: event='%s' action='%s'", x_github_event, action)

    # 3. Handle 'ping'
    if x_github_event == "ping":
        return {
            "status": "pong",
            "zen": payload.get("zen", ""),
            "hook_id": payload.get("hook_id"),
        }

    # 4. Handle 'installation' lifecycle events
    if x_github_event in ("installation", "installation_repositories"):
        installation_id = payload.get("installation", {}).get("id")
        account = payload.get("installation", {}).get("account", {}).get("login", "")
        logger.info(
            "GitHub App installation event: action=%s, id=%s, account=%s",
            action,
            installation_id,
            account,
        )
        return {
            "status": "processed",
            "event": x_github_event,
            "action": action,
            "installation_id": installation_id,
            "account": account,
        }

    # 5. Handle 'pull_request' lifecycle events
    if x_github_event == "pull_request":
        pr_data = payload.get("pull_request", {})
        pr_number = pr_data.get("number")
        pr_url = pr_data.get("html_url")
        merged = pr_data.get("merged", False)
        branch_name = pr_data.get("head", {}).get("ref")

        if action == "closed":
            # If closed & merged, update remediation attempt and incident
            if merged:
                stmt = select(RemediationAttempt).where(
                    (RemediationAttempt.pr_number == pr_number)
                    | (RemediationAttempt.branch_name == branch_name)
                    | (RemediationAttempt.pr_url == pr_url)
                ).order_by(RemediationAttempt.created_at.desc())
                res = await db.execute(stmt)
                attempt = res.scalars().first()

                if attempt:
                    attempt.status = RemediationStatus.PR_MERGED
                    inc_stmt = select(Incident).where(Incident.id == attempt.incident_id)
                    inc_res = await db.execute(inc_stmt)
                    incident = inc_res.scalar_one_or_none()
                    if incident:
                        incident.status = IncidentStatus.RESOLVED
                        logger.info(
                            "Remediation PR #%s merged! Incident %s marked RESOLVED",
                            pr_number,
                            incident.id,
                        )
                    await db.commit()

            return {
                "status": "processed",
                "event": "pull_request",
                "action": action,
                "merged": merged,
                "pr_number": pr_number,
            }

        return {
            "status": "acknowledged",
            "event": "pull_request",
            "action": action,
            "pr_number": pr_number,
        }

    return {
        "status": "ignored",
        "event": x_github_event,
        "action": action,
        "message": f"Event '{x_github_event}' does not require processing",
    }
