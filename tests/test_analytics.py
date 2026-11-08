"""
Tests for real PostgreSQL analytics & ROI telemetry endpoints (app/api/v1/analytics.py).
"""

from __future__ import annotations

import asyncio
import unittest
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.core.auth import get_current_tenant
from app.database import get_session_factory, init_db
from app.main import app
from app.models.incident import Incident, IncidentStatus, RemediationAttempt, RemediationStatus
from app.models.organization import Organization, PlanTier
from app.models.repository import RemediationMode, Repository
from app.schemas.analytics import AnalyticsOverviewResponse


class TestAnalyticsOverviewEndpoint(unittest.TestCase):
    """Verify GET /api/v1/analytics/overview returns real DB telemetry and correct derived metrics."""

    @classmethod
    def setUpClass(cls):
        asyncio.run(init_db())
        session_factory = get_session_factory()

        cls.org_id = uuid.uuid4()
        cls.other_org_id = uuid.uuid4()

        cls.org = Organization(
            id=cls.org_id,
            name="Analytics Test Org",
            slug=f"analytics-test-{uuid.uuid4().hex[:6]}",
            plan_tier=PlanTier.PRO,
        )
        cls.other_org = Organization(
            id=cls.other_org_id,
            name="Other Analytics Org",
            slug=f"other-analytics-{uuid.uuid4().hex[:6]}",
            plan_tier=PlanTier.FREE,
        )

        async def _seed():
            async with session_factory() as db:
                db.add(
                    Organization(
                        id=cls.org_id,
                        name=cls.org.name,
                        slug=cls.org.slug,
                        plan_tier=PlanTier.PRO,
                    )
                )
                db.add(
                    Organization(
                        id=cls.other_org_id,
                        name=cls.other_org.name,
                        slug=cls.other_org.slug,
                        plan_tier=PlanTier.FREE,
                    )
                )

                # Seed 3 repositories for cls.org: 2 private, 1 public, 2 active
                db.add(
                    Repository(
                        id=str(uuid.uuid4()),
                        organization_id=str(cls.org_id),
                        repo_owner="test-owner",
                        repo_name="private-repo-1",
                        is_private=True,
                        is_active=True,
                        remediation_mode=RemediationMode.AUTONOMOUS,
                    )
                )
                db.add(
                    Repository(
                        id=str(uuid.uuid4()),
                        organization_id=str(cls.org_id),
                        repo_owner="test-owner",
                        repo_name="private-repo-2",
                        is_private=True,
                        is_active=False,
                        remediation_mode=RemediationMode.DISABLED,
                    )
                )
                db.add(
                    Repository(
                        id=str(uuid.uuid4()),
                        organization_id=str(cls.org_id),
                        repo_owner="test-owner",
                        repo_name="public-repo-1",
                        is_private=False,
                        is_active=True,
                        remediation_mode=RemediationMode.AUTONOMOUS,
                    )
                )

                # Seed 1 repo for other org
                db.add(
                    Repository(
                        id=str(uuid.uuid4()),
                        organization_id=str(cls.other_org_id),
                        repo_owner="other-owner",
                        repo_name="other-repo",
                        is_private=True,
                        is_active=True,
                        remediation_mode=RemediationMode.AUTONOMOUS,
                    )
                )

                # Seed incidents for cls.org:
                now = datetime.now(timezone.utc)

                # 1. Resolved incident with 45s duration
                inc1 = Incident(
                    id=uuid.uuid4(),
                    organization_id=cls.org_id,
                    sentry_issue_id=f"ISSUE-{uuid.uuid4().hex[:6]}",
                    fingerprint=uuid.uuid4().hex,
                    title="Resolved error",
                    error_type="ZeroDivisionError",
                    status=IncidentStatus.RESOLVED,
                    created_at=now - timedelta(seconds=100),
                    updated_at=now - timedelta(seconds=55),
                )
                db.add(inc1)
                await db.flush()

                # Add attempt with PR URL
                db.add(
                    RemediationAttempt(
                        id=uuid.uuid4(),
                        organization_id=cls.org_id,
                        incident_id=inc1.id,
                        strategy="automated_fix",
                        status=RemediationStatus.PR_OPENED,
                        pr_url="https://github.com/test-owner/private-repo-1/pull/1",
                        pr_number=1,
                        branch_name="autoheal/fix-1",
                        llm_model="gpt-4o",
                    )
                )

                # 2. Failed incident
                inc2 = Incident(
                    id=uuid.uuid4(),
                    organization_id=cls.org_id,
                    sentry_issue_id=f"ISSUE-{uuid.uuid4().hex[:6]}",
                    fingerprint=uuid.uuid4().hex,
                    title="Failed error",
                    error_type="TypeError",
                    status=IncidentStatus.FAILED,
                    created_at=now - timedelta(seconds=200),
                    updated_at=now - timedelta(seconds=190),
                )
                db.add(inc2)

                # 3. Pending incident
                inc3 = Incident(
                    id=uuid.uuid4(),
                    organization_id=cls.org_id,
                    sentry_issue_id=f"ISSUE-{uuid.uuid4().hex[:6]}",
                    fingerprint=uuid.uuid4().hex,
                    title="Pending error",
                    error_type="KeyError",
                    status=IncidentStatus.PENDING,
                    created_at=now - timedelta(seconds=50),
                    updated_at=now - timedelta(seconds=50),
                )
                db.add(inc3)

                # 4. Remediating incident
                inc4 = Incident(
                    id=uuid.uuid4(),
                    organization_id=cls.org_id,
                    sentry_issue_id=f"ISSUE-{uuid.uuid4().hex[:6]}",
                    fingerprint=uuid.uuid4().hex,
                    title="Remediating error",
                    error_type="ValueError",
                    status=IncidentStatus.REMEDIATING,
                    created_at=now - timedelta(seconds=30),
                    updated_at=now - timedelta(seconds=20),
                )
                db.add(inc4)

                await db.commit()

        asyncio.run(_seed())

    def test_overview_exact_schema_and_calculations(self):
        """Test GET /api/v1/analytics/overview returns the exact schema and correct metrics."""
        app.dependency_overrides[get_current_tenant] = lambda: self.org

        with TestClient(app) as client:
            res = client.get("/api/v1/analytics/overview")
            self.assertEqual(res.status_code, 200)
            data = res.json()

            # Validate against Pydantic schema
            parsed = AnalyticsOverviewResponse.model_validate(data)
            self.assertIsNotNone(parsed)

            # Repositories checks
            # 3 repos total: 2 private, 1 public, 2 active (67% autopilot)
            self.assertEqual(data["repositories"]["total"], 3)
            self.assertEqual(data["repositories"]["private"], 2)
            self.assertEqual(data["repositories"]["public"], 1)
            self.assertEqual(data["repositories"]["autopilot"], 2)
            self.assertEqual(data["repositories"]["autopilot_pct"], 67)

            # Incidents checks
            # 4 incidents total: 1 healed PR, 1 remediating, 1 failed, 1 pending
            self.assertEqual(data["incidents"]["total"], 4)
            self.assertEqual(data["incidents"]["healed_prs"], 1)
            self.assertEqual(data["incidents"]["remediating"], 1)
            self.assertEqual(data["incidents"]["failed"], 1)
            self.assertEqual(data["incidents"]["pending"], 1)

            # Derived metrics checks
            # success_rate = round((1 / 4) * 100, 1) = 25.0
            self.assertEqual(data["incidents"]["success_rate"], 25.0)

            # mttr_seconds = (100 - 55) = 45.0
            self.assertEqual(data["incidents"]["mttr_seconds"], 45.0)

            # ROI checks
            # healed_prs = 1
            self.assertEqual(data["roi"]["healed_prs"], 1)
            # hours_saved = round(1 * 2.5, 1) = 2.5
            self.assertEqual(data["roi"]["hours_saved"], 2.5)
            # cost_saved_usd = round(2.5 * 65) = 162
            self.assertEqual(data["roi"]["cost_saved_usd"], round(2.5 * 65))
            self.assertEqual(data["roi"]["hourly_rate_assumed"], 65)
            self.assertEqual(data["roi"]["hours_per_incident"], 2.5)
            self.assertEqual(data["roi"]["pro_plan_cost"], 29)
            self.assertEqual(data["roi"]["roi_multiplier"], round(data["roi"]["cost_saved_usd"] / 29, 1))

            # vitality_score = 100 - (1 / 4) * 25 = 93.8
            self.assertEqual(data["vitality_score"], 93.8)

    def test_overview_tenant_isolation(self):
        """Organization B should see only its own telemetry (zero leaked records)."""
        app.dependency_overrides[get_current_tenant] = lambda: self.other_org

        with TestClient(app) as client:
            res = client.get("/api/v1/analytics/overview")
            self.assertEqual(res.status_code, 200)
            data = res.json()

            # other_org has 1 repo, 0 incidents
            self.assertEqual(data["repositories"]["total"], 1)
            self.assertEqual(data["repositories"]["private"], 1)
            self.assertEqual(data["repositories"]["public"], 0)
            self.assertEqual(data["repositories"]["autopilot"], 1)
            self.assertEqual(data["repositories"]["autopilot_pct"], 100)

            self.assertEqual(data["incidents"]["total"], 0)
            self.assertEqual(data["incidents"]["healed_prs"], 0)
            self.assertEqual(data["incidents"]["remediating"], 0)
            self.assertEqual(data["incidents"]["failed"], 0)
            self.assertEqual(data["incidents"]["pending"], 0)
            self.assertEqual(data["incidents"]["success_rate"], 100.0)
            self.assertIsNone(data["incidents"]["mttr_seconds"])

            self.assertEqual(data["roi"]["healed_prs"], 0)
            self.assertEqual(data["roi"]["hours_saved"], 0.0)
            self.assertEqual(data["roi"]["cost_saved_usd"], 0)
            self.assertEqual(data["roi"]["hourly_rate_assumed"], 65)
            self.assertEqual(data["roi"]["hours_per_incident"], 2.5)
            self.assertEqual(data["roi"]["pro_plan_cost"], 29)
            self.assertEqual(data["roi"]["roi_multiplier"], 0.0)
            self.assertEqual(data["vitality_score"], 100.0)

    def test_trailing_slash_variants(self):
        """Both /overview and /overview/ should respond with HTTP 200."""
        app.dependency_overrides[get_current_tenant] = lambda: self.org

        with TestClient(app) as client:
            res1 = client.get("/api/v1/analytics/overview")
            res2 = client.get("/api/v1/analytics/overview/")
            self.assertEqual(res1.status_code, 200)
            self.assertEqual(res2.status_code, 200)
            self.assertEqual(res1.json(), res2.json())


if __name__ == "__main__":
    unittest.main()
