"""SQLAlchemy models for multi-repo management and Sentry mappings."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.organization import Organization


class RemediationMode(str, enum.Enum):
    AUTONOMOUS = "autonomous"
    DRAFT_PR = "draft_pr"
    MANUAL_APPROVAL = "manual_approval"
    DISABLED = "disabled"


class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    github_repo_id: Mapped[int | None] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), nullable=True, index=True
    )
    repo_owner: Mapped[str] = mapped_column(String(256), nullable=False)
    repo_name: Mapped[str] = mapped_column(String(256), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(128), default="main", nullable=False)
    language: Mapped[str] = mapped_column(String(64), default="python", nullable=False)
    is_private: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    monorepo_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    remediation_mode: Mapped[RemediationMode] = mapped_column(
        Enum(RemediationMode, native_enum=False), default=RemediationMode.AUTONOMOUS, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Execution overrides
    test_command: Mapped[str] = mapped_column(String(512), default="pytest -xvs tests/", nullable=False)
    llm_model: Mapped[str] = mapped_column(String(64), default="gpt-4o", nullable=False)

    # Metrics
    open_prs_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    merged_prs_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __init__(self, **kwargs):
        if "name" in kwargs and "repo_name" not in kwargs:
            kwargs["repo_name"] = kwargs.pop("name")
        elif "name" in kwargs:
            kwargs.pop("name")

        if "full_name" in kwargs:
            fn = kwargs.pop("full_name")
            if "/" in fn:
                parts = fn.split("/", 1)
                if "repo_owner" not in kwargs:
                    kwargs["repo_owner"] = parts[0]
                if "repo_name" not in kwargs:
                    kwargs["repo_name"] = parts[1]

        if "private" in kwargs and "is_private" not in kwargs:
            kwargs["is_private"] = kwargs.pop("private")
        elif "private" in kwargs:
            kwargs.pop("private")

        if "organization_id" in kwargs and kwargs["organization_id"] is not None:
            kwargs["organization_id"] = str(kwargs["organization_id"])

        super().__init__(**kwargs)

    @property
    def name(self) -> str:
        return self.repo_name

    @name.setter
    def name(self, val: str) -> None:
        self.repo_name = val

    @property
    def full_name(self) -> str:
        return f"{self.repo_owner}/{self.repo_name}"

    @full_name.setter
    def full_name(self, val: str) -> None:
        if "/" in val:
            parts = val.split("/", 1)
            self.repo_owner = parts[0]
            self.repo_name = parts[1]
        else:
            self.repo_name = val

    @property
    def private(self) -> bool:
        return self.is_private

    @private.setter
    def private(self, val: bool) -> None:
        self.is_private = val

    @property
    def healed_prs_count(self) -> int:
        return getattr(self, "_healed_prs_count", 0)

    @healed_prs_count.setter
    def healed_prs_count(self, val: int) -> None:
        self._healed_prs_count = val

    @property
    def open_incidents_count(self) -> int:
        return getattr(self, "_open_incidents_count", 0)

    @open_incidents_count.setter
    def open_incidents_count(self, val: int) -> None:
        self._open_incidents_count = val

    # Relationships
    sentry_mappings: Mapped[List[SentryProjectMapping]] = relationship(
        "SentryProjectMapping", back_populates="repository", cascade="all, delete-orphan", lazy="selectin"
    )


class SentryProjectMapping(Base):
    __tablename__ = "sentry_project_mappings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    repository_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sentry_org_slug: Mapped[str] = mapped_column(String(128), nullable=False)
    sentry_project_slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    environment: Mapped[str] = mapped_column(String(64), default="production", nullable=False)
    path_prefix: Mapped[str | None] = mapped_column(String(256), nullable=True)
    last_event_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    repository: Mapped[Repository] = relationship("Repository", back_populates="sentry_mappings")