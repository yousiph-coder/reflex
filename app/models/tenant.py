"""
SQLAlchemy ORM models for user identity and organization membership.

Tables
------
``users``
    Application users authenticated via JWT (Supabase Auth / external IdP).

``organization_members``
    Many-to-many join table linking users to organizations with a role
    (owner, admin, member).
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.organization import Organization


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


__all__ = ["User", "OrganizationMember", "MemberRole", "Organization"]


class MemberRole(str, enum.Enum):
    """Roles within an organization."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class User(Base):
    """An authenticated application user."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=_new_uuid,
    )
    email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
        unique=True,
        index=True,
        comment="User email address (unique)",
    )
    github_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        unique=True,
        index=True,
        comment="GitHub user ID for OAuth linking",
    )
    name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        default="",
        comment="Display name",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
    )

    # Relationships
    memberships: Mapped[list["OrganizationMember"]] = relationship(
        "OrganizationMember",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id!s}, email={self.email})>"


class OrganizationMember(Base):
    """Membership join between a User and an Organization with a role."""

    __tablename__ = "organization_members"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=_new_uuid,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role", native_enum=False),
        nullable=False,
        default=MemberRole.MEMBER,
        comment="User's role within the organization",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="memberships",
    )
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="members",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_user_org_membership"),
        Index("ix_org_members_org_user", "organization_id", "user_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<OrganizationMember(user={self.user_id!s}, "
            f"org={self.organization_id!s}, role={self.role.value})>"
        )


# Avoid circular imports — import Organization at the bottom for type resolution
from app.models.organization import Organization  # noqa: E402
