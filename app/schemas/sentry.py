"""
Pydantic schemas for Sentry webhook payloads and internal event types.

These schemas parse the *subset* of Sentry's webhook JSON that the
auto-heal pipeline actually needs.  Unknown fields are silently
ignored (``model_config = ConfigDict(extra="ignore")``) so the
schemas don't break when Sentry ships new attributes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Stack frame ─────────────────────────────────────────────────
class SentryStackFrame(BaseModel):
    """A single frame in a Sentry stack trace."""

    model_config = ConfigDict(extra="ignore")

    filename: str | None = Field(default=None, description="Source file relative path")
    abs_path: str | None = Field(default=None, description="Absolute file path")
    function: str | None = Field(default=None, description="Function name")
    module: str | None = Field(default=None, description="Dotted module path")
    lineno: int | None = Field(default=None, description="Line number")
    colno: int | None = Field(default=None, description="Column number")
    context_line: str | None = Field(default=None, description="Source line at lineno")
    pre_context: list[str] | None = Field(default=None, description="Lines before context_line")
    post_context: list[str] | None = Field(default=None, description="Lines after context_line")
    in_app: bool = Field(default=False, description="Whether the frame is in application code")
    vars: dict[str, Any] | None = Field(default=None, description="Local variables snapshot")


# ── Stack trace ─────────────────────────────────────────────────
class SentryStackTrace(BaseModel):
    """Stack trace wrapper containing ordered frames."""

    model_config = ConfigDict(extra="ignore")

    frames: list[SentryStackFrame] = Field(default_factory=list)


# ── Exception value ─────────────────────────────────────────────
class SentryException(BaseModel):
    """A single exception in Sentry's ``exception.values`` array."""

    model_config = ConfigDict(extra="ignore")

    type: str | None = Field(default=None, description="Exception class name")
    value: str | None = Field(default=None, description="Exception message")
    module: str | None = Field(default=None, description="Module where exception is defined")
    mechanism: dict[str, Any] | None = Field(default=None, description="Exception mechanism metadata")
    stacktrace: SentryStackTrace | None = Field(default=None, description="Stack trace for this exception")


# ── Exception container ────────────────────────────────────────
class SentryExceptionContainer(BaseModel):
    """Wrapper for ``event.exception``."""

    model_config = ConfigDict(extra="ignore")

    values: list[SentryException] = Field(default_factory=list)


# ── Tag ─────────────────────────────────────────────────────────
class SentryTag(BaseModel):
    """A key-value tag pair attached to a Sentry event."""

    model_config = ConfigDict(extra="ignore")

    key: str
    value: str


# ── Event ───────────────────────────────────────────────────────
class SentryEvent(BaseModel):
    """Core event object from a Sentry webhook ``data.event``."""

    model_config = ConfigDict(extra="ignore")

    event_id: str | None = Field(default=None, alias="event_id")
    title: str | None = Field(default=None)
    message: str | None = Field(default=None)
    platform: str | None = Field(default=None)
    level: str = Field(default="error")
    logger: str | None = Field(default=None)
    environment: str | None = Field(default=None)
    timestamp: float | None = Field(default=None, description="Unix epoch timestamp")
    tags: list[SentryTag | list[str]] | None = Field(default=None)
    exception: SentryExceptionContainer | None = Field(default=None)
    culprit: str | None = Field(default=None, description="Short description of error origin")
    extra: dict[str, Any] | None = Field(default=None)
    contexts: dict[str, Any] | None = Field(default=None)

    def get_primary_exception(self) -> SentryException | None:
        """Return the last (most recent / outermost) exception value."""
        if self.exception and self.exception.values:
            return self.exception.values[-1]
        return None

    def get_top_in_app_frame(self) -> SentryStackFrame | None:
        """Return the topmost in-app stack frame from the primary exception."""
        exc = self.get_primary_exception()
        if exc and exc.stacktrace and exc.stacktrace.frames:
            for frame in reversed(exc.stacktrace.frames):
                if frame.in_app:
                    return frame
            # fallback: return the last frame regardless
            return exc.stacktrace.frames[-1]
        return None

    def build_stack_trace_text(self) -> str:
        """Render a human-readable stack trace string from all exception values."""
        parts: list[str] = []
        if not self.exception:
            return ""
        for exc in self.exception.values:
            header = f"{exc.type or 'UnknownError'}: {exc.value or ''}"
            parts.append(header)
            if exc.stacktrace:
                for frame in exc.stacktrace.frames:
                    loc = frame.filename or frame.abs_path or "<unknown>"
                    func = frame.function or "<unknown>"
                    line = frame.lineno or "?"
                    parts.append(f"  File \"{loc}\", line {line}, in {func}")
                    if frame.context_line:
                        parts.append(f"    {frame.context_line.strip()}")
        return "\n".join(parts)


# ── Sentry webhook data wrapper ────────────────────────────────
class SentryWebhookData(BaseModel):
    """``data`` field of the Sentry webhook payload."""

    model_config = ConfigDict(extra="ignore")

    event: SentryEvent | None = Field(default=None)
    triggered_rule: str | None = Field(default=None)


# ── Top-level webhook payload ──────────────────────────────────
class SentryWebhookPayload(BaseModel):
    """Top-level Sentry webhook payload (``POST`` body).

    Sentry sends different ``action`` values.  For alert-rule
    webhooks the relevant action is ``"triggered"``.
    """

    model_config = ConfigDict(extra="ignore")

    action: str = Field(..., description="Webhook action type")
    data: SentryWebhookData = Field(..., description="Payload data envelope")
    actor: dict[str, Any] | None = Field(default=None, description="Actor who triggered the event")
    installation: dict[str, Any] | None = Field(default=None)

    @field_validator("action")
    @classmethod
    def _validate_action(cls, v: str) -> str:
        allowed = {"triggered", "created", "resolved", "assigned", "ignored"}
        if v not in allowed:
            raise ValueError(f"Unsupported Sentry action '{v}'. Expected one of {allowed}")
        return v


# ── Internal incident event (used across the pipeline) ─────────
class InternalIncidentEvent(BaseModel):
    """Normalised, enriched representation of an incident used internally.

    Created from the parsed Sentry payload after scrubbing & dedup.
    This is what gets enqueued for the analysis worker.
    """

    model_config = ConfigDict(extra="ignore")

    incident_id: uuid.UUID = Field(description="Database PK of the persisted Incident row")
    sentry_issue_id: str
    sentry_event_id: str | None = None
    fingerprint: str = Field(description="SHA-256 dedup fingerprint")
    title: str
    error_type: str
    error_message: str | None = None
    file_path: str | None = None
    function_name: str | None = None
    line_number: int | None = None
    stack_trace: str | None = None
    project_slug: str | None = None
    environment: str | None = None
    platform: str | None = None
    level: str = "error"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_worker_payload(self) -> dict[str, Any]:
        """Serialise to a JSON-safe dict for queue/worker hand-off."""
        data = self.model_dump(mode="json")
        data["incident_id"] = str(self.incident_id)
        return data


# ── Webhook response ───────────────────────────────────────────
class WebhookAckResponse(BaseModel):
    """Response schema for the webhook endpoint (202 Accepted)."""

    status: str = Field(default="accepted")
    incident_id: uuid.UUID | None = Field(
        default=None,
        description="Database ID of the created incident (None if deduplicated)",
    )
    deduplicated: bool = Field(
        default=False,
        description="True when the event was already processed within the TTL window",
    )
    message: str = Field(default="Event received")
