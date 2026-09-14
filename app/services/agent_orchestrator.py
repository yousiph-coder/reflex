"""
LLM agent orchestrator — the reasoning engine of Auto-Heal AI.

Constructs a rich prompt from incident context, file content, and blame
data, then requests a structured JSON remediation plan from an
OpenAI-compatible LLM.  The response is validated against
``RemediationOutput`` and returned for sandbox testing.

Key design choices
------------------
- **Structured output**: the LLM is instructed to respond with a JSON
  object whose schema exactly matches ``RemediationOutput``.
  The response is parsed and validated with Pydantic — malformed JSON
  triggers an automatic retry.
- **Exponential backoff**: transient API errors (429, 5xx, timeouts)
  are retried up to ``max_retries`` times with 2^n back-off.
- **Feedback loop**: when a previous attempt failed sandbox validation,
  the error output is injected into the prompt so the LLM can
  self-correct.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

import httpx

from app.config import get_settings
from app.schemas.remediation import (
    IncidentContext,
    RemediationOutput,
    RetryContext,
)

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=10.0)

# ── System prompt ───────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are **Auto-Heal AI**, an expert autonomous Site Reliability Engineer.
Your job is to analyse production incidents, identify root causes, and
produce precise code patches that fix the issue.

## Your capabilities
- Read stack traces and map them to source code.
- Understand application architecture from file context and git blame.
- Write minimal, targeted code patches (search-and-replace blocks).
- Generate validation unit tests for every patch.

## Rules
1. **Accuracy over speed** — only propose changes you are confident about.
2. **Minimal diffs** — change the fewest lines necessary to fix the bug.
3. **search_block must be verbatim** — copy the exact existing code so the
   search-and-replace can be applied mechanically.  Do NOT paraphrase.
4. **Unit test must be self-contained** — it should import only from the
   project or stdlib and assert the fix is correct.
5. **confidence_score** — rate your own confidence honestly (0.0–1.0).
   If you are guessing, say so.
6. **post_mortem_summary** — write in Markdown, suitable for a GitHub PR
   description.  Include what broke, why, and how the fix works.

## Output format
Respond with a single JSON object matching this schema exactly:

```json
{
  "root_cause_analysis": "<detailed explanation>",
  "confidence_score": 0.85,
  "file_patches": [
    {
      "file_path": "relative/path/to/file.py",
      "search_block": "<exact existing code>",
      "replace_block": "<fixed code>",
      "action": "modify",
      "explanation": "<why this change>"
    }
  ],
  "unit_test": {
    "test_file_path": "tests/test_fix.py",
    "test_code": "<complete test source>",
    "test_command": "pytest -xvs tests/test_fix.py",
    "test_framework": "pytest"
  },
  "post_mortem_summary": "<markdown summary>",
  "suggested_preventions": ["<prevention 1>", "..."]
}
```

Do NOT wrap the JSON in markdown code fences.  Output raw JSON only.
"""


# ═════════════════════════════════════════════════════════════════
# Agent Orchestrator
# ═════════════════════════════════════════════════════════════════

class AgentOrchestrator:
    """LLM-backed remediation reasoning engine.

    Usage::

        orch = AgentOrchestrator()
        result = await orch.generate_remediation(context)
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
        max_retries: int = 3,
    ) -> None:
        settings = get_settings()
        self._api_key = api_key or settings.llm_api_key.get_secret_value()
        self._model = model or settings.llm_model
        self._base_url = (base_url or settings.llm_base_url).rstrip("/")
        self._max_tokens = max_tokens or settings.llm_max_tokens
        self._temperature = temperature if temperature is not None else settings.llm_temperature
        self._max_retries = max_retries
        self._client: httpx.AsyncClient | None = None

    async def init(self) -> None:
        self._client = httpx.AsyncClient(timeout=_TIMEOUT)

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            raise RuntimeError("AgentOrchestrator not initialised — call init()")
        return self._client

    # ── Public API ──────────────────────────────────────────────

    async def generate_remediation(
        self,
        context: IncidentContext,
    ) -> tuple[RemediationOutput, dict[str, int]]:
        """Generate a complete remediation plan for the given incident.

        Returns
        -------
        tuple[RemediationOutput, dict]
            The validated remediation output and a token-usage dict
            ``{"prompt_tokens": …, "completion_tokens": …, "total_tokens": …}``.

        Raises
        ------
        RuntimeError
            If the LLM fails to produce valid output after all retries.
        """
        user_prompt = self._build_user_prompt(context)
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        return await self._call_llm_with_retries(messages)

    # ── Prompt construction ─────────────────────────────────────

    def _build_user_prompt(self, ctx: IncidentContext) -> str:
        """Assemble the full user prompt from incident context."""
        sections: list[str] = []

        # Header
        sections.append(
            f"## Incident: {ctx.title}\n"
            f"- **Error type**: `{ctx.error_type}`\n"
            f"- **Environment**: {ctx.environment or 'unknown'}\n"
            f"- **Platform**: {ctx.platform or 'unknown'}\n"
            f"- **Level**: {ctx.level}\n"
            f"- **Repository**: {ctx.repo_owner}/{ctx.repo_name}\n"
        )

        # Error message
        if ctx.error_message:
            sections.append(
                f"## Error Message\n```\n{ctx.error_message}\n```"
            )

        # Stack trace
        if ctx.stack_trace:
            sections.append(
                f"## Stack Trace\n```\n{ctx.stack_trace}\n```"
            )

        # Error location
        if ctx.file_path:
            loc_parts = [f"- **File**: `{ctx.file_path}`"]
            if ctx.function_name:
                loc_parts.append(f"- **Function**: `{ctx.function_name}`")
            if ctx.line_number:
                loc_parts.append(f"- **Line**: {ctx.line_number}")
            sections.append("## Error Location\n" + "\n".join(loc_parts))

        # File contexts
        for fc in ctx.file_contexts:
            lang = fc.language or ""
            header = f"## Source: `{fc.file_path}` (lines {fc.start_line}–{fc.end_line})"
            sections.append(
                f"{header}\n```{lang}\n{fc.content}\n```"
            )

        # Blame info
        if ctx.blame_info:
            if ctx.blame_info.recent_commits:
                commits_text = "\n".join(
                    f"- `{c.get('sha', '')[:8]}` {c.get('author', '')}: "
                    f"{c.get('message', '').splitlines()[0]}"
                    for c in ctx.blame_info.recent_commits[:5]
                )
                sections.append(
                    f"## Recent Commits on `{ctx.blame_info.file_path}`\n{commits_text}"
                )

            if ctx.blame_info.blame_entries:
                blame_text = "\n".join(
                    f"- Lines {b.get('start_line')}–{b.get('end_line')}: "
                    f"`{b.get('commit_sha', '')[:8]}` by {b.get('author', '')} "
                    f"({b.get('date', '')})"
                    for b in ctx.blame_info.blame_entries[:10]
                )
                sections.append(f"## Git Blame\n{blame_text}")

        # Retry context (feedback loop)
        if ctx.retry_context:
            rc = ctx.retry_context
            sections.append(
                f"## ⚠️ Previous Attempt #{rc.attempt_number} Failed\n\n"
                f"Your previous fix did not pass validation. Here is the "
                f"sandbox output:\n\n"
                f"```\n{rc.sandbox_result.truncated_output(3000)}\n```\n\n"
                f"Please analyse the failure and produce a corrected patch. "
                f"Do NOT repeat the same mistake."
            )
            if rc.feedback_instructions:
                sections.append(
                    f"### Additional Guidance\n{rc.feedback_instructions}"
                )

        return "\n\n".join(sections)

    # ── LLM call with retries ──────────────────────────────────

    async def _call_llm_with_retries(
        self,
        messages: list[dict[str, str]],
    ) -> tuple[RemediationOutput, dict[str, int]]:
        """Call the LLM with exponential backoff and JSON validation retries."""
        client = self._get_client()
        last_error: Exception | None = None

        for attempt in range(1, self._max_retries + 1):
            backoff = min(2 ** (attempt - 1), 30)
            try:
                start_time = time.monotonic()

                request_body: dict[str, Any] = {
                    "model": self._model,
                    "messages": messages,
                    "max_tokens": self._max_tokens,
                    "temperature": self._temperature,
                }

                # Request JSON mode if the provider supports it
                request_body["response_format"] = {"type": "json_object"}

                resp = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json=request_body,
                )

                elapsed = time.monotonic() - start_time

                # Handle rate limits
                if resp.status_code == 429:
                    retry_after = float(
                        resp.headers.get("Retry-After", str(backoff))
                    )
                    logger.warning(
                        "LLM rate limited (attempt %d/%d); waiting %.1fs",
                        attempt,
                        self._max_retries,
                        retry_after,
                    )
                    await asyncio.sleep(retry_after)
                    continue

                # Handle server errors
                if resp.status_code >= 500:
                    logger.warning(
                        "LLM server error %d (attempt %d/%d)",
                        resp.status_code,
                        attempt,
                        self._max_retries,
                    )
                    await asyncio.sleep(backoff)
                    continue

                resp.raise_for_status()
                data = resp.json()

                # Extract content and usage
                choice = data["choices"][0]
                raw_content = choice["message"]["content"]
                usage = data.get("usage", {})
                token_usage = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }

                # Parse and validate JSON
                remediation = self._parse_llm_response(raw_content)

                logger.info(
                    "LLM remediation generated in %.1fs "
                    "(model=%s, tokens=%d, confidence=%.0f%%)",
                    elapsed,
                    self._model,
                    token_usage["total_tokens"],
                    remediation.confidence_score * 100,
                )

                return remediation, token_usage

            except _LLMParseError as exc:
                last_error = exc
                logger.warning(
                    "LLM output parse failed (attempt %d/%d): %s",
                    attempt,
                    self._max_retries,
                    exc,
                )
                # Inject parse error feedback into the conversation
                messages.append({
                    "role": "assistant",
                    "content": exc.raw_content,
                })
                messages.append({
                    "role": "user",
                    "content": (
                        f"Your response was not valid JSON or failed schema "
                        f"validation:\n\n{exc}\n\n"
                        f"Please output a corrected JSON object matching the "
                        f"required schema exactly.  No markdown fences."
                    ),
                })
                await asyncio.sleep(backoff)

            except httpx.HTTPError as exc:
                last_error = exc
                logger.warning(
                    "LLM HTTP error (attempt %d/%d): %s",
                    attempt,
                    self._max_retries,
                    exc,
                )
                await asyncio.sleep(backoff)

            except Exception as exc:
                last_error = exc
                logger.error(
                    "Unexpected LLM error (attempt %d/%d): %s",
                    attempt,
                    self._max_retries,
                    exc,
                    exc_info=True,
                )
                await asyncio.sleep(backoff)

        raise RuntimeError(
            f"LLM failed to produce valid remediation after "
            f"{self._max_retries} attempts: {last_error}"
        )

    # ── Response parsing ────────────────────────────────────────

    @staticmethod
    def _parse_llm_response(raw: str) -> RemediationOutput:
        """Parse the LLM's raw text response into a validated ``RemediationOutput``.

        Handles common LLM quirks: markdown fences, trailing commas,
        BOM characters, and leading/trailing whitespace.
        """
        cleaned = raw.strip()

        # Strip markdown code fences if the LLM wraps them anyway
        if cleaned.startswith("```"):
            # Remove opening fence (```json or ```)
            first_newline = cleaned.index("\n")
            cleaned = cleaned[first_newline + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()

        # Remove BOM
        cleaned = cleaned.lstrip("\ufeff")

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise _LLMParseError(
                f"JSON decode failed: {exc}", raw_content=raw,
            ) from exc

        try:
            return RemediationOutput.model_validate(parsed)
        except Exception as exc:
            raise _LLMParseError(
                f"Schema validation failed: {exc}", raw_content=raw,
            ) from exc


class _LLMParseError(ValueError):
    """Internal error raised when the LLM response can't be parsed."""

    def __init__(self, message: str, *, raw_content: str = "") -> None:
        super().__init__(message)
        self.raw_content = raw_content
