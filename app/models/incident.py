"""
SQLAlchemy ORM models for incident tracking and remediation.

Tables
------
``incidents``
    Stores every unique Sentry event after deduplication and secret
    scrubbing.  Lifecycle: PENDING → ANALYZING → REMEDIATING → RESOLVED | FAILED.

``remediation_attempts``
    Audit log of every LLM-driven fix attempt against an incident,
    including the generated diff, PR URL, model metadata, and token
    usage.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.organization import Organization


# ── Enums ───────────────────────────────────────────────────────
class IncidentStatus(str, enum.Enum):
    """Lifecycle states for an incident."""

    PENDING = "PENDING"
    ANALYZING = "ANALYZING"
    REMEDIATING = "REMEDIATING"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"
    IGNORED = "IGNORED"


class RemediationStatus(str, enum.Enum):
    """Lifecycle states for a single remediation attempt."""

    IN_PROGRESS = "IN_PROGRESS"
    PR_OPENED = "PR_OPENED"
    PR_MERGED = "PR_MERGED"
    FAILED = "FAILED"
    ROLLED_BACK = "ROLLED_BACK"


# ── Helper ──────────────────────────────────────────────────────
def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ── Incident ────────────────────────────────────────────────────
class Incident(Base):
    """A deduplicated, scrubbed Sentry incident."""

    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=_new_uuid,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Tenant organization ID",
    )
    sentry_issue_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True,
        comment="Sentry issue / group ID",
    )
    sentry_event_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="Specific Sentry event ID within the issue",
    )
    fingerprint: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        comment="SHA-256 dedup fingerprint (issue_id + file_path + error_type)",
    )
    title: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
        comment="Human-readable issue title from Sentry",
    )
    error_type: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        index=True,
        comment="Fully-qualified exception class name",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Exception message (scrubbed)",
    )
    file_path: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
        comment="Primary file where the error originated",
    )
    function_name: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        comment="Function or method where the error was raised",
    )
    line_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Line number of the failing frame",
    )
    stack_trace: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Full stack trace, secrets scrubbed",
    )
    raw_event: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Original Sentry event payload (scrubbed)",
    )
    project_slug: Mapped[str | None] = mapped_column(
        String(256),
        nullable=True,
        comment="Sentry project slug",
    )
    environment: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="Deployment environment (production, staging, …)",
    )
    platform: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="Language / platform (python, node, …)",
    )
    level: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="error",
        comment="Sentry severity level",
    )
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(IncidentStatus, name="incident_status", native_enum=False),
        nullable=False,
        default=IncidentStatus.PENDING,
        index=True,
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of remediation retries attempted",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="incidents",
    )
    remediation_attempts: Mapped[list["RemediationAttempt"]] = relationship(
        "RemediationAttempt",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="RemediationAttempt.created_at.desc()",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_incidents_status_created", "status", "created_at"),
        Index("ix_incidents_org_status", "organization_id", "status"),
        Index("ix_incidents_org_created", "organization_id", "created_at"),
        UniqueConstraint("fingerprint", name="uq_incidents_fingerprint"),
    )

    def __repr__(self) -> str:
        return (
            f"<Incident(id={self.id!s}, issue={self.sentry_issue_id}, "
            f"status={self.status.value})>"
        )


# ── Remediation Attempt ────────────────────────────────────────
class RemediationAttempt(Base):
    """An individual LLM-driven fix attempt for an incident."""

    __tablename__ = "remediation_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=_new_uuid,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Tenant organization ID",
    )
    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    strategy: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        comment="Remediation strategy label (e.g. 'direct_fix', 'rollback', 'config_change')",
    )
    analysis: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="LLM's root-cause analysis output",
    )
    diff: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Unified diff of the proposed code change",
    )
    pr_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True,
        comment="GitHub Pull Request URL",
    )
    pr_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="GitHub PR number",
    )
    branch_name: Mapped[str | None] = mapped_column(
        String(256),
        nullable=True,
        comment="Git branch created for this attempt",
    )
    status: Mapped[RemediationStatus] = mapped_column(
        Enum(RemediationStatus, name="remediation_status", native_enum=False),
        nullable=False,
        default=RemediationStatus.IN_PROGRESS,
        index=True,
    )
    llm_model: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        comment="LLM model identifier used for this attempt",
    )
    llm_provider: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="LLM provider (openai, anthropic, …)",
    )
    prompt_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of prompt tokens consumed",
    )
    completion_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of completion tokens generated",
    )
    total_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Total tokens (prompt + completion)",
    )
    cost_usd: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="Estimated cost in USD for this LLM call",
    )
    duration_seconds: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="Wall-clock duration of the LLM call",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Error details if the attempt failed",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
    )

    # Relationships
    incident: Mapped["Incident"] = relationship(
        "Incident",
        back_populates="remediation_attempts",
    )
    organization: Mapped["Organization"] = relationship(
        "Organization",
    )

    __table_args__ = (
        Index("ix_remediation_incident_status", "incident_id", "status"),
        Index("ix_remediation_org_status", "organization_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<RemediationAttempt(id={self.id!s}, incident={self.incident_id!s}, "
            f"strategy={self.strategy}, status={self.status.value})>"
        )
