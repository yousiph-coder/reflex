from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.repository import RemediationMode


class SentryMappingCreate(BaseModel):
    sentry_org_slug: str
    sentry_project_slug: str
    environment: str = "production"
    path_prefix: Optional[str] = None


class SentryMappingResponse(SentryMappingCreate):
    id: str
    last_event_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RepositoryCreate(BaseModel):
    repo_owner: str
    repo_name: str
    default_branch: str = "main"
    language: str = "python"
    is_private: bool = True
    monorepo_path: Optional[str] = None
    remediation_mode: RemediationMode = RemediationMode.AUTONOMOUS
    test_command: str = "pytest -xvs tests/"
    llm_model: str = "gpt-4o"
    sentry_mappings: List[SentryMappingCreate] = Field(default_factory=list)


class RepositoryUpdate(BaseModel):
    default_branch: Optional[str] = None
    language: Optional[str] = None
    is_private: Optional[bool] = None
    monorepo_path: Optional[str] = None
    remediation_mode: Optional[RemediationMode] = None
    is_active: Optional[bool] = None
    test_command: Optional[str] = None
    llm_model: Optional[str] = None


class RepositoryResponse(BaseModel):
    id: str
    organization_id: str
    repo_owner: str
    repo_name: str
    default_branch: str = "main"
    language: str = "python"
    is_private: bool = True
    monorepo_path: Optional[str] = None
    remediation_mode: RemediationMode = RemediationMode.AUTONOMOUS
    is_active: bool = True
    test_command: str = "pytest -xvs tests/"
    llm_model: str = "gpt-4o"
    open_prs_count: int = 0
    merged_prs_count: int = 0
    healed_prs_count: int = 0
    open_incidents_count: int = 0
    created_at: datetime
    updated_at: datetime
    sentry_mappings: List[SentryMappingResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SentryTestRequest(BaseModel):
    organization_slug: str
    project_slug: str


class SentryTestResponse(BaseModel):
    success: bool
    project_id: str
    status: str


class RepositorySyncRequest(BaseModel):
    installation_id: Optional[int] = None


SyncPayload = RepositorySyncRequest