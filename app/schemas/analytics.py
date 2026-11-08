"""
Pydantic schemas for analytics and telemetry reporting.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class RepositoryAnalytics(BaseModel):
    total: int = Field(..., description="Total repositories count")
    private: int = Field(..., description="Private repositories count")
    public: int = Field(..., description="Public repositories count")
    autopilot: int = Field(..., description="Autopilot active repositories count")
    autopilot_pct: int = Field(..., description="Percentage of repositories on autopilot")


class IncidentAnalytics(BaseModel):
    total: int = Field(..., description="Total incidents count")
    healed_prs: int = Field(..., description="Count of healed PRs")
    remediating: int = Field(..., description="Count of remediating/analyzing/running incidents")
    failed: int = Field(..., description="Count of failed incidents")
    pending: int = Field(..., description="Count of pending incidents")
    success_rate: float = Field(..., description="Remediation success rate percentage")
    mttr_seconds: Optional[float] = Field(None, description="Mean time to remediation in seconds")


class RoiAnalytics(BaseModel):
    healed_prs: int = Field(..., description="Count of healed PRs")
    hours_saved: float = Field(..., description="Engineering hours saved")
    cost_saved_usd: int = Field(..., description="Cost saved in USD")
    hourly_rate_assumed: int = Field(65, description="Hourly engineering rate assumed in USD")
    hours_per_incident: float = Field(2.5, description="Engineering hours assumed saved per incident")
    pro_plan_cost: int = Field(29, description="Monthly Pro plan cost in USD")
    roi_multiplier: float = Field(..., description="ROI multiplier relative to Pro plan cost")


class AnalyticsOverviewResponse(BaseModel):
    repositories: RepositoryAnalytics
    incidents: IncidentAnalytics
    roi: RoiAnalytics
    vitality_score: float = Field(..., description="System vitality/reliability score")
