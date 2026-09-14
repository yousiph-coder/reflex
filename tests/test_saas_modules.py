"""
Unit and integration tests for the SaaS production modules:
1. Multi-tenant Organization & API Key security
2. Multi-channel Notification Dispatcher (Slack Block Kit & Discord Embeds)
3. Incident & Analytics Schemas and Endpoints
"""

import datetime
import unittest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.security import generate_api_key, hash_api_key, verify_api_key
from app.models.incident import Incident, IncidentStatus, RemediationAttempt, RemediationStatus
from app.models.organization import APIKey, Organization, PlanTier
from app.schemas.incident import (
    AnalyticsMetricsResponse,
    IncidentDetailResponse,
    IncidentListResponse,
    IncidentSummaryResponse,
    OrganizationResponse,
)
from app.services.notifier import Notifier


class TestSecurityAndAuth(unittest.TestCase):
    """Test API key generation, hashing, and constant-time verification."""

    def test_generate_api_key(self):
        raw_key, prefix, hashed = generate_api_key(prefix="ah_live_")
        self.assertTrue(raw_key.startswith("ah_live_"))
        self.assertEqual(prefix, raw_key[:16])
        self.assertEqual(len(hashed), 64)  # SHA-256 hex digest length
        self.assertTrue(verify_api_key(raw_key, hashed))
        self.assertFalse(verify_api_key("invalid_key", hashed))

    def test_hash_api_key_deterministic(self):
        key = "ah_live_sample_token_1234567890"
        hash1 = hash_api_key(key)
        hash2 = hash_api_key(key)
        self.assertEqual(hash1, hash2)
        self.assertTrue(verify_api_key(key, hash1))


class TestNotifierPayloads(unittest.TestCase):
    """Test Multi-Channel Notification Dispatcher formats."""

    def setUp(self):
        self.notifier = Notifier(
            slack_webhook_url="https://hooks.slack.com/services/test/test/test",
            discord_webhook_url="https://discord.com/api/webhooks/test/test",
        )

    def test_slack_block_kit_pr_opened(self):
        payload = self.notifier._build_slack_pr_opened_payload(
            incident_title="KeyError in auth.py",
            error_type="KeyError",
            file_path="app/services/auth.py",
            root_cause_summary="Direct access to session_data['user_id'] without check",
            sandbox_test_results="Passed 5/5 tests in 0.31s",
            confidence_score=0.98,
            pr_url="https://github.com/org/repo/pull/1",
            pr_number=1,
        )

        attachments = payload.get("attachments", [])
        self.assertEqual(len(attachments), 1)
        self.assertEqual(attachments[0]["color"], "#2ECC71")

        blocks = attachments[0]["blocks"]
        # Check header
        self.assertEqual(blocks[0]["type"], "header")
        self.assertIn("Remediation PR Opened", blocks[0]["text"]["text"])

        # Check action button
        action_block = [b for b in blocks if b["type"] == "actions"][0]
        btn = action_block["elements"][0]
        self.assertEqual(btn["type"], "button")
        self.assertEqual(btn["url"], "https://github.com/org/repo/pull/1")
        self.assertIn("#1", btn["text"]["text"])

    def test_discord_embed_pr_opened(self):
        payload = self.notifier._build_discord_pr_opened_payload(
            incident_title="KeyError in auth.py",
            error_type="KeyError",
            file_path="app/services/auth.py",
            root_cause_summary="Unchecked dict key",
            sandbox_test_results="5/5 passed",
            confidence_score=0.98,
            pr_url="https://github.com/org/repo/pull/42",
            pr_number=42,
        )

        self.assertIn("embeds", payload)
        embed = payload["embeds"][0]
        self.assertEqual(embed["color"], 0x2ECC71)  # Emerald green
        self.assertEqual(embed["url"], "https://github.com/org/repo/pull/42")

        field_names = [f["name"] for f in embed["fields"]]
        self.assertIn("Error Type", field_names)
        self.assertIn("Target File", field_names)
        self.assertIn("Confidence Score", field_names)
        self.assertIn("Sandbox Verification", field_names)
        self.assertIn("Root Cause Analysis", field_names)


class TestIncidentSchemas(unittest.TestCase):
    """Test Pydantic schemas serialization and validations."""

    def test_analytics_metrics_schema(self):
        data = {
            "total_incidents": 25,
            "resolved_incidents": 20,
            "failed_incidents": 2,
            "pending_incidents": 2,
            "remediating_incidents": 1,
            "autoheal_success_rate_pct": 90.91,
            "avg_mttr_seconds": 45.2,
            "total_remediation_attempts": 28,
            "successful_remediation_attempts": 20,
            "sandbox_pass_rate_pct": 71.43,
            "total_tokens_consumed": 85000,
            "estimated_cost_usd": 0.425,
            "top_failing_files": [{"name": "app/services/auth.py", "count": 12}],
            "top_error_types": [{"name": "KeyError", "count": 14}],
        }
        metrics = AnalyticsMetricsResponse(**data)
        self.assertEqual(metrics.total_incidents, 25)
        self.assertEqual(metrics.autoheal_success_rate_pct, 90.91)
        self.assertEqual(metrics.avg_mttr_seconds, 45.2)
        self.assertEqual(len(metrics.top_failing_files), 1)

    def test_incident_summary_schema(self):
        org_id = uuid.uuid4()
        inc_id = uuid.uuid4()
        now = datetime.datetime.now(datetime.timezone.utc)

        summary = IncidentSummaryResponse(
            id=inc_id,
            organization_id=org_id,
            sentry_issue_id="ISSUE-100",
            title="Unhandled NullPointerException",
            error_type="NullPointerException",
            status=IncidentStatus.PENDING,
            created_at=now,
            updated_at=now,
        )
        self.assertEqual(summary.id, inc_id)
        self.assertEqual(summary.status, IncidentStatus.PENDING)


class TestAuthDependency(unittest.IsolatedAsyncioTestCase):
    """Test get_current_org dependency and error scenarios."""

    async def test_missing_api_key_raises_401(self):
        from fastapi import HTTPException
        from app.core.auth import get_current_org

        db = AsyncMock()
        with self.assertRaises(HTTPException) as cm:
            await get_current_org(raw_api_key=None, db=db)
        self.assertEqual(cm.exception.status_code, 401)
        self.assertIn("Missing", cm.exception.detail)

    async def test_invalid_api_key_raises_401(self):
        from fastapi import HTTPException
        from app.core.auth import get_current_org

        db = AsyncMock()
        db_res = MagicMock()
        db_res.scalar_one_or_none.return_value = None
        db.execute.return_value = db_res

        with self.assertRaises(HTTPException) as cm:
            await get_current_org(raw_api_key="ah_live_invalidkey", db=db)
        self.assertEqual(cm.exception.status_code, 401)
        self.assertIn("Invalid API key", cm.exception.detail)

    async def test_inactive_api_key_raises_401(self):
        from fastapi import HTTPException
        from app.core.auth import get_current_org

        db = AsyncMock()
        mock_key = MagicMock()
        mock_key.is_active = False
        mock_key.key_prefix = "ah_live_test"
        db_res = MagicMock()
        db_res.scalar_one_or_none.return_value = mock_key
        db.execute.return_value = db_res

        with self.assertRaises(HTTPException) as cm:
            await get_current_org(raw_api_key="ah_live_deactivated", db=db)
        self.assertEqual(cm.exception.status_code, 401)
        self.assertIn("deactivated", cm.exception.detail)

    async def test_valid_api_key_returns_organization(self):
        from app.core.auth import get_current_org

        db = AsyncMock()
        mock_org = Organization(
            id=uuid.uuid4(),
            name="Acme Corp",
            slug="acme-corp",
            plan_tier=PlanTier.ENTERPRISE,
            is_active=True,
        )
        mock_key = MagicMock()
        mock_key.is_active = True
        mock_key.expires_at = None
        mock_key.organization = mock_org
        db_res = MagicMock()
        db_res.scalar_one_or_none.return_value = mock_key
        db.execute.return_value = db_res

        org = await get_current_org(raw_api_key="ah_live_validkey12345", db=db)
        self.assertEqual(org.name, "Acme Corp")
        self.assertEqual(org.slug, "acme-corp")
        self.assertEqual(org.plan_tier, PlanTier.ENTERPRISE)


if __name__ == "__main__":
    unittest.main()
