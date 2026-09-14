"""
SQLAlchemy ORM models for multi-tenant organizations and API keys.

Tables
------
``organizations``
    Tenant accounts with subscription tiers and ownership.

``api_keys``
    Hashed API access tokens for authenticating inbound webhook events
    and REST API queries.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.incident import Incident, RemediationAttempt


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


class PlanTier(str, enum.Enum):
    """SaaS subscription plan tiers."""

    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Organization(Base):
    """Tenant organization entity."""

    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=_new_uuid,
    )
    name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        comment="Organization display name",
    )
    slug: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
        comment="URL-safe unique organization identifier",
    )
    plan_tier: Mapped[PlanTier] = mapped_column(
        Enum(PlanTier, name="plan_tier", native_enum=False),
        nullable=False,
        default=PlanTier.FREE,
        index=True,
        comment="Subscription tier for rate limits and features",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
        comment="Whether the organization account is active",
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

    # ── Relationships ───────────────────────────────────────────
    api_keys: Mapped[list["APIKey"]] = relationship(
        "APIKey",
        back_populates="organization",
        cascade="all, delete-orphan",
        order_by="APIKey.created_at.desc()",
        lazy="selectin",
    )
    incidents: Mapped[list["Incident"]] = relationship(
        "Incident",
        back_populates="organization",
        cascade="all, delete-orphan",
        order_by="Incident.created_at.desc()",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Organization(id={self.id!s}, slug={self.slug}, plan={self.plan_tier.value})>"


class APIKey(Base):
    """Scoped authentication key belonging to an organization."""

    __tablename__ = "api_keys"

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
    )
    name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        comment="Human-readable label for the key (e.g. 'Production Ingestion')",
    )
    key_prefix: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        index=True,
        comment="Display prefix (first 16 chars) for user identification",
    )
    hashed_key: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
        comment="SHA-256 hex digest of the raw API key secret",
    )
    scopes: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: ["incidents:read", "incidents:write", "webhooks:write", "analytics:read"],
        comment="List of permission scopes granted to this key",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
        comment="Active status flag",
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of the most recent API call using this key",
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Optional expiration timestamp for automated key rotation",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
    )

    # ── Relationships ───────────────────────────────────────────
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="api_keys",
    )

    __table_args__ = (
        Index("ix_api_keys_org_active", "organization_id", "is_active"),
        UniqueConstraint("hashed_key", name="uq_api_keys_hashed_key"),
    )

    def __repr__(self) -> str:
        return f"<APIKey(id={self.id!s}, prefix={self.key_prefix}..., org={self.organization_id!s})>"
