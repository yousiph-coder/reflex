"""
Pydantic schemas for Incident queries, detailed views, and aggregated analytics metrics.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.incident import IncidentStatus, RemediationStatus
from app.models.organization import PlanTier


# ── Organization & API Key Schemas ──────────────────────────────

class OrganizationResponse(BaseModel):
    """Public organization tenant representation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    plan_tier: PlanTier
    is_active: bool
    created_at: datetime


class APIKeyCreateRequest(BaseModel):
    """Payload to generate a new API key."""

    name: str = Field(..., min_length=2, max_length=128, description="Label for the API key")
    scopes: list[str] = Field(
        default=["incidents:read", "incidents:write", "webhooks:write", "analytics:read"],
        description="Permission scopes",
    )
    expires_in_days: int | None = Field(default=None, ge=1, le=365, description="Optional TTL in days")


class APIKeyResponse(BaseModel):
    """Public metadata representation of an API key (never exposes raw secret)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime


class APIKeyCreatedResponse(APIKeyResponse):
    """Returned only once upon key generation — includes the raw secret."""

    raw_key: str = Field(..., description="Plaintext secret. Save now — this will not be shown again.")


# ── Remediation Attempt Schemas ─────────────────────────────────

class RemediationAttemptResponse(BaseModel):
    """Detailed audit information for an individual LLM remediation attempt."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    incident_id: uuid.UUID
    strategy: str
    analysis: str | None = None
    diff: str | None = None
    pr_url: str | None = None
    pr_number: int | None = None
    branch_name: str | None = None
    status: RemediationStatus
    llm_model: str
    llm_provider: str | None = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float | None = None
    duration_seconds: float | None = None
    error_message: str | None = None
    created_at: datetime


# ── Incident Schemas ────────────────────────────────────────────

class ReasoningStep(BaseModel):
    step: int
    title: str
    description: str


class IncidentSummaryResponse(BaseModel):
    """Concise incident summary for paginated listings and dashboards."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    sentry_issue_id: str
    title: str
    error_type: str
    error_message: str | None = None
    file_path: str | None = None
    function_name: str | None = None
    line_number: int | None = None
    project_slug: str | None = None
    environment: str | None = None
    platform: str | None = None
    level: str = "error"
    status: IncidentStatus
    retry_count: int = 0
    pr_url: str | None = None
    branch_name: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class IncidentDetailResponse(IncidentSummaryResponse):
    """Full incident inspection including stack trace, raw events, and remediation attempts."""

    stack_trace: str | None = None
    raw_event: dict[str, Any] | None = None
    remediation_attempts: list[RemediationAttemptResponse] = Field(default_factory=list)
    repository_full_name: str | None = None
    pr_number: int | None = None
    confidence_score: float = 98.4
    severity_vitality: int = 1
    original_code: str | None = None
    patched_code: str | None = None
    reasoning_steps: list[ReasoningStep] = Field(default_factory=list)


class IncidentListResponse(BaseModel):
    """Paginated response envelope for incident queries."""

    items: list[IncidentSummaryResponse]
    total: int = Field(ge=0, description="Total matching incidents across all pages")
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, description="Items per page")
    total_pages: int = Field(ge=0, description="Total page count")


class IncidentRejectRequest(BaseModel):
    """Optional payload when rejecting an incident remediation."""

    reason: str | None = Field(default=None, description="Reason for rejection feedback")


class IncidentRejectResponse(BaseModel):
    """Response returned upon rejecting an incident remediation."""

    status: str = Field(default="REJECTED", description="Updated status")
    incident_id: uuid.UUID = Field(description="Incident ID")
    reason: str | None = Field(default=None, description="Provided rejection reason")
    message: str = Field(default="Incident remediation was rejected.", description="Summary message")


# ── Analytics & Metrics Schemas ─────────────────────────────────

class MetricItem(BaseModel):
    name: str
    count: int


class AnalyticsMetricsResponse(BaseModel):
    """Aggregated SaaS observability & incident remediation metrics."""

    total_incidents: int = Field(description="Total incidents recorded for tenant")
    resolved_incidents: int = Field(description="Incidents successfully remediated (PR merged/opened)")
    failed_incidents: int = Field(description="Incidents that exhausted retry budget")
    pending_incidents: int = Field(description="Incidents awaiting analysis or worker pick-up")
    remediating_incidents: int = Field(description="Incidents currently executing in LLM/sandbox")
    autoheal_success_rate_pct: float = Field(
        description="Percentage of resolved incidents over closed incidents (resolved + failed)"
    )
    avg_mttr_seconds: float | None = Field(
        description="Mean Time to Remediation in seconds for resolved incidents"
    )
    total_remediation_attempts: int = Field(description="Total LLM fix iterations executed")
    successful_remediation_attempts: int = Field(description="Attempts that passed sandbox and opened PR")
    sandbox_pass_rate_pct: float = Field(
        description="Percentage of sandbox test executions that completed with exit code 0"
    )
    total_tokens_consumed: int = Field(description="Total LLM tokens across all attempts")
    estimated_cost_usd: float = Field(description="Estimated LLM infrastructure cost")
    top_failing_files: list[MetricItem] = Field(default_factory=list)
    top_error_types: list[MetricItem] = Field(default_factory=list)
