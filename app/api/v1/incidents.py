"""
REST API endpoints for incident queries, detailed inspection, and analytics.

Endpoints
---------
GET /api/v1/incidents
    Paginated incident list with status, repository, and date-range filtering.

GET /api/v1/incidents/{id}
    Detailed view with stack traces, RCA markdown, diffs, and sandbox logs.

GET /api/v1/analytics/metrics
    Aggregated MTTR, success rates, and token observability.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_org
from app.database import get_db_session
from app.models.incident import Incident, IncidentStatus, RemediationAttempt, RemediationStatus
from app.models.organization import Organization
from app.schemas.incident import (
    AnalyticsMetricsResponse,
    IncidentDetailResponse,
    IncidentListResponse,
    IncidentSummaryResponse,
    MetricItem,
    RemediationAttemptResponse,
)

router = APIRouter(tags=["incidents"])
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── GET /api/v1/incidents ───────────────────────────────────────

@router.get(
    "/incidents",
    response_model=IncidentListResponse,
    summary="List tenant incidents",
    description="Returns a paginated list of incidents for the authenticated organization.",
)
async def list_incidents(
    status_filter: IncidentStatus | None = Query(None, alias="status", description="Filter by status"),
    repository: str | None = Query(None, description="Filter by repository or project slug"),
    error_type: str | None = Query(None, description="Filter by exception class"),
    start_date: datetime | None = Query(None, description="Filter created on or after"),
    end_date: datetime | None = Query(None, description="Filter created on or before"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size limit"),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db_session),
) -> IncidentListResponse:
    """Fetch paginated incidents filtered by tenant and parameters."""
    where_clauses = [Incident.organization_id == org.id]

    if status_filter is not None:
        where_clauses.append(Incident.status == status_filter)
    if repository:
        repo_term = f"%{repository}%"
        where_clauses.append(
            or_(
                Incident.project_slug == repository,
                Incident.file_path.ilike(repo_term),
            )
        )
    if error_type:
        where_clauses.append(Incident.error_type == error_type)
    if start_date:
        where_clauses.append(Incident.created_at >= start_date)
    if end_date:
        where_clauses.append(Incident.created_at <= end_date)

    # Count total matching rows
    count_stmt = select(func.count(Incident.id)).where(*where_clauses)
    total_result = await db.execute(count_stmt)
    total_count: int = total_result.scalar() or 0

    # Fetch paginated rows
    offset = (page - 1) * page_size
    query = (
        select(Incident)
        .where(*where_clauses)
        .order_by(Incident.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    res = await db.execute(query)
    incidents = res.scalars().all()

    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 0

    items = [
        IncidentSummaryResponse.model_validate(inc)
        for inc in incidents
    ]

    return IncidentListResponse(
        items=items,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ── GET /api/v1/incidents/{id} ──────────────────────────────────

@router.get(
    "/incidents/{id}",
    response_model=IncidentDetailResponse,
    summary="Get incident detail",
    description="Returns detailed incident metadata including stack trace and all remediation attempts.",
)
async def get_incident(
    id: uuid.UUID,
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db_session),
) -> IncidentDetailResponse:
    """Retrieve full incident details and audit trail for an incident."""
    query = (
        select(Incident)
        .options(selectinload(Incident.remediation_attempts))
        .where(
            Incident.id == id,
            Incident.organization_id == org.id,
        )
    )
    res = await db.execute(query)
    incident = res.scalar_one_or_none()

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{id}' not found",
        )

    attempts = [
        RemediationAttemptResponse.model_validate(a)
        for a in incident.remediation_attempts
    ]

    response = IncidentDetailResponse.model_validate(incident)
    response.remediation_attempts = attempts
    return response


# ── GET /api/v1/analytics/metrics ───────────────────────────────

@analytics_router.get(
    "/metrics",
    response_model=AnalyticsMetricsResponse,
    summary="Aggregated SaaS analytics & MTTR metrics",
    description="Calculates autonomous remediation performance, MTTR, sandbox pass rates, and token costs.",
)
async def get_analytics_metrics(
    start_date: datetime | None = Query(None, description="Window start time"),
    end_date: datetime | None = Query(None, description="Window end time"),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db_session),
) -> AnalyticsMetricsResponse:
    """Compute aggregated incident KPIs and closed-loop metrics for the organization."""
    inc_clauses = [Incident.organization_id == org.id]
    att_clauses = [RemediationAttempt.organization_id == org.id]

    if start_date:
        inc_clauses.append(Incident.created_at >= start_date)
        att_clauses.append(RemediationAttempt.created_at >= start_date)
    if end_date:
        inc_clauses.append(Incident.created_at <= end_date)
        att_clauses.append(RemediationAttempt.created_at <= end_date)

    # 1. Total incidents and counts per status
    status_query = (
        select(Incident.status, func.count(Incident.id))
        .where(*inc_clauses)
        .group_by(Incident.status)
    )
    status_res = await db.execute(status_query)
    status_counts: dict[IncidentStatus, int] = {row[0]: row[1] for row in status_res.all()}

    resolved_count = status_counts.get(IncidentStatus.RESOLVED, 0)
    failed_count = status_counts.get(IncidentStatus.FAILED, 0)
    pending_count = status_counts.get(IncidentStatus.PENDING, 0)
    remediating_count = status_counts.get(IncidentStatus.REMEDIATING, 0) + status_counts.get(IncidentStatus.ANALYZING, 0)
    total_incidents = sum(status_counts.values())

    # Auto-heal success rate: resolved / (resolved + failed)
    closed_incidents = resolved_count + failed_count
    autoheal_success_rate = (
        round((resolved_count / closed_incidents) * 100, 2)
        if closed_incidents > 0
        else 0.0
    )

    # 2. MTTR for resolved incidents
    # Fetch durations in seconds between created_at and updated_at for resolved incidents
    mttr_query = (
        select(Incident.created_at, Incident.updated_at)
        .where(
            Incident.organization_id == org.id,
            Incident.status == IncidentStatus.RESOLVED,
            *([Incident.created_at >= start_date] if start_date else []),
            *([Incident.created_at <= end_date] if end_date else []),
        )
    )
    mttr_res = await db.execute(mttr_query)
    resolved_rows = mttr_res.all()
    durations = [
        (row[1] - row[0]).total_seconds()
        for row in resolved_rows
        if row[1] and row[0] and (row[1] >= row[0])
    ]
    avg_mttr = round(sum(durations) / len(durations), 2) if durations else None

    # 3. Remediation attempts metrics
    attempts_query = (
        select(
            func.count(RemediationAttempt.id),
            func.coalesce(func.sum(RemediationAttempt.total_tokens), 0),
            func.coalesce(func.sum(RemediationAttempt.cost_usd), 0.0),
        ).where(*att_clauses)
    )
    att_res = await db.execute(attempts_query)
    att_row = att_res.one()
    total_attempts: int = att_row[0]
    total_tokens: int = int(att_row[1])
    total_cost: float = round(float(att_row[2]), 4)

    # Successful attempts (sandbox passed -> PR opened or merged)
    success_att_query = (
        select(func.count(RemediationAttempt.id))
        .where(
            *att_clauses,
            RemediationAttempt.status.in_([RemediationStatus.PR_OPENED, RemediationStatus.PR_MERGED]),
        )
    )
    success_att_res = await db.execute(success_att_query)
    successful_attempts: int = success_att_res.scalar() or 0

    sandbox_pass_rate = (
        round((successful_attempts / total_attempts) * 100, 2)
        if total_attempts > 0
        else 0.0
    )

    # 4. Top failing files
    top_files_query = (
        select(Incident.file_path, func.count(Incident.id))
        .where(
            *inc_clauses,
            Incident.file_path.isnot(None),
        )
        .group_by(Incident.file_path)
        .order_by(func.count(Incident.id).desc())
        .limit(5)
    )
    top_files_res = await db.execute(top_files_query)
    top_failing_files = [
        MetricItem(name=row[0], count=row[1])
        for row in top_files_res.all()
        if row[0]
    ]

    # 5. Top error types
    top_errors_query = (
        select(Incident.error_type, func.count(Incident.id))
        .where(*inc_clauses)
        .group_by(Incident.error_type)
        .order_by(func.count(Incident.id).desc())
        .limit(5)
    )
    top_errors_res = await db.execute(top_errors_query)
    top_error_types = [
        MetricItem(name=row[0], count=row[1])
        for row in top_errors_res.all()
        if row[0]
    ]

    return AnalyticsMetricsResponse(
        total_incidents=total_incidents,
        resolved_incidents=resolved_count,
        failed_incidents=failed_count,
        pending_incidents=pending_count,
        remediating_incidents=remediating_count,
        autoheal_success_rate_pct=autoheal_success_rate,
        avg_mttr_seconds=avg_mttr,
        total_remediation_attempts=total_attempts,
        successful_remediation_attempts=successful_attempts,
        sandbox_pass_rate_pct=sandbox_pass_rate,
        total_tokens_consumed=total_tokens,
        estimated_cost_usd=total_cost,
        top_failing_files=top_failing_files,
        top_error_types=top_error_types,
    )
