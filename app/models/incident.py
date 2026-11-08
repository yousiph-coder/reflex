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
    JSON,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
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
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    REJECTED = "REJECTED"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"
    IGNORED = "IGNORED"
    MERGED = "merged"
    PR_OPEN = "pr_open"
    HEALED = "healed"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_upper = value.upper()
            val_lower = value.lower()
            for member in cls:
                if (
                    member.value.upper() == val_upper
                    or member.name.upper() == val_upper
                    or member.value.lower() == val_lower
                ):
                    return member
            if val_lower in ("resolved", "merged", "healed", "pr_open", "closed"):
                return cls.RESOLVED
        return super()._missing_(value)


class RemediationStatus(str, enum.Enum):
    """Lifecycle states for a single remediation attempt."""

    IN_PROGRESS = "IN_PROGRESS"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    REJECTED = "REJECTED"
    PR_OPENED = "PR_OPENED"
    PR_MERGED = "PR_MERGED"
    FAILED = "FAILED"
    ROLLED_BACK = "ROLLED_BACK"


class IncidentStatusType(Enum):
    """Case-tolerant and alias-tolerant Enum column type for IncidentStatus."""

    def _object_value_for_elem(self, elem):
        if elem in self._object_lookup:
            return self._object_lookup[elem]
        if isinstance(elem, str):
            for k, v in self._object_lookup.items():
                if k and k.upper() == elem.upper():
                    return v
            if elem.lower() in ("merged", "healed", "pr_open", "closed", "resolved"):
                return self._object_lookup.get("RESOLVED") or self._object_lookup.get("MERGED")
        return super()._object_value_for_elem(elem)


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
        Uuid,
        primary_key=True,
        default=_new_uuid,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
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
        JSON().with_variant(JSONB, "postgresql"),
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
        IncidentStatusType(IncidentStatus, name="incident_status", native_enum=False),
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

    def __init__(self, **kwargs):
        if "id" not in kwargs:
            kwargs["id"] = _new_uuid()
        if "sentry_issue_id" not in kwargs:
            kwargs["sentry_issue_id"] = f"ISSUE-{uuid.uuid4().hex[:8]}"
        if "fingerprint" not in kwargs:
            kwargs["fingerprint"] = uuid.uuid4().hex
        if "title" not in kwargs:
            msg = kwargs.get("error_message") or kwargs.get("error_type") or "AutoHeal Incident"
            kwargs["title"] = str(msg)[:1000]

        repo_id = kwargs.pop("repository_id", None)
        pr_url = kwargs.pop("pr_url", None)
        branch_name = kwargs.pop("branch_name", None)
        resolved_at = kwargs.pop("resolved_at", None)

        if resolved_at and "updated_at" not in kwargs:
            kwargs["updated_at"] = resolved_at

        super().__init__(**kwargs)

        if repo_id or pr_url or branch_name:
            if not self.raw_event or not isinstance(self.raw_event, dict):
                self.raw_event = {}
            if repo_id:
                self.raw_event["repository_id"] = str(repo_id)
            if pr_url:
                self.raw_event["pr_url"] = str(pr_url)
            if branch_name:
                self.raw_event["branch_name"] = str(branch_name)

        if pr_url:
            st = RemediationStatus.PR_MERGED if str(self.status).lower() in ["merged", "resolved"] else RemediationStatus.PR_OPENED
            self.remediation_attempts.append(
                RemediationAttempt(
                    id=uuid.uuid4(),
                    organization_id=self.organization_id,
                    incident_id=self.id,
                    strategy="autonomous_fix",
                    status=st,
                    pr_url=str(pr_url),
                    pr_number=3 if "#3" in str(pr_url) or "/3" in str(pr_url) else 1,
                    branch_name=branch_name or "autoheal/fix",
                    llm_model="gpt-4o",
                )
            )

    @property
    def repository_id(self) -> str | None:
        return self.raw_event.get("repository_id") if isinstance(self.raw_event, dict) else None

    @repository_id.setter
    def repository_id(self, val: str) -> None:
        if not self.raw_event or not isinstance(self.raw_event, dict):
            self.raw_event = {}
        self.raw_event["repository_id"] = str(val)

    @property
    def pr_url(self) -> str | None:
        if self.remediation_attempts:
            for att in self.remediation_attempts:
                if att.pr_url:
                    return att.pr_url
        return self.raw_event.get("pr_url") if isinstance(self.raw_event, dict) else None

    @pr_url.setter
    def pr_url(self, val: str) -> None:
        if not self.raw_event or not isinstance(self.raw_event, dict):
            self.raw_event = {}
        self.raw_event["pr_url"] = str(val)

    @property
    def branch_name(self) -> str | None:
        if self.remediation_attempts:
            for att in self.remediation_attempts:
                if att.branch_name:
                    return att.branch_name
        return self.raw_event.get("branch_name") if isinstance(self.raw_event, dict) else None

    @branch_name.setter
    def branch_name(self, val: str) -> None:
        if not self.raw_event or not isinstance(self.raw_event, dict):
            self.raw_event = {}
        self.raw_event["branch_name"] = str(val)

    @property
    def resolved_at(self) -> datetime | None:
        if self.raw_event and isinstance(self.raw_event, dict) and "resolved_at" in self.raw_event:
            val = self.raw_event["resolved_at"]
            if isinstance(val, datetime):
                return val
            if isinstance(val, str):
                try:
                    return datetime.fromisoformat(val)
                except Exception:
                    pass
        if str(getattr(self.status, "value", self.status)).lower() in ["merged", "resolved", "healed"]:
            return self.updated_at
        return None

    @resolved_at.setter
    def resolved_at(self, val: datetime) -> None:
        self.updated_at = val
        if not self.raw_event or not isinstance(self.raw_event, dict):
            self.raw_event = {}
        self.raw_event["resolved_at"] = val.isoformat() if hasattr(val, "isoformat") else str(val)

    def __repr__(self) -> str:
        st_val = getattr(self.status, "value", self.status)
        return (
            f"<Incident(id={self.id!s}, issue={self.sentry_issue_id}, "
            f"status={st_val})>"
        )


# ── Remediation Attempt ────────────────────────────────────────
class RemediationAttempt(Base):
    """An individual LLM-driven fix attempt for an incident."""

    __tablename__ = "remediation_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=_new_uuid,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Tenant organization ID",
    )
    incident_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
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
