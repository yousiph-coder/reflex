"""
Unit and integration tests for Human-in-the-Loop (HITL) approval workflow:
1. Enums and schemas (AWAITING_APPROVAL, REJECTED).
2. Worker pipeline routing based on repository remediation_mode.
3. API endpoints:
   - POST /api/v1/incidents/{incident_id}/approve
   - POST /api/v1/incidents/{incident_id}/reject
4. Multi-channel notification dispatcher for approval events.
"""

from __future__ import annotations

import unittest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.core.auth import get_current_tenant
from app.database import get_session_factory
from app.main import app
from app.models.incident import (
    Incident,
    IncidentStatus,
    RemediationAttempt,
    RemediationStatus,
)
from app.models.organization import Organization, PlanTier
from app.models.repository import RemediationMode, Repository
from app.schemas.incident import (
    IncidentRejectRequest,
    IncidentRejectResponse,
)
from app.schemas.remediation import (
    FilePatch,
    PatchAction,
    RemediationOutput,
    SandboxResult,
    UnitTestSpec,
)
from app.services.notification import NotificationDispatcher, NotificationType
from app.services.notifier import Notifier
from app.workers.incident_worker import IncidentWorker


def _sample_remediation_output() -> RemediationOutput:
    return RemediationOutput(
        root_cause_analysis="Sample root cause analysis explaining the bug in detail.",
        confidence_score=0.95,
        file_patches=[
            FilePatch(
                file_path="app/services/example.py",
                action=PatchAction.MODIFY,
                search_block="x = None",
                replace_block="x = 42",
                explanation="Fix None dereference",
            )
        ],
        unit_test=UnitTestSpec(
            test_file_path="tests/test_example.py",
            test_code="def test_example():\n    assert True\n",
            test_command="pytest tests/test_example.py",
            test_framework="pytest",
        ),
        post_mortem_summary="Resolved None dereference by initializing x to 42.",
        suggested_preventions=["Add static type checking"],
    )


class TestHITLModelsAndEnums(unittest.TestCase):
    """Test enum members and Pydantic schemas for HITL approval."""

    def test_incident_status_enum(self):
        self.assertEqual(IncidentStatus.AWAITING_APPROVAL.value, "AWAITING_APPROVAL")
        self.assertEqual(IncidentStatus.REJECTED.value, "REJECTED")

    def test_remediation_status_enum(self):
        self.assertEqual(RemediationStatus.AWAITING_APPROVAL.value, "AWAITING_APPROVAL")
        self.assertEqual(RemediationStatus.REJECTED.value, "REJECTED")

    def test_reject_request_schema(self):
        req = IncidentRejectRequest(reason="Performance regression risk")
        self.assertEqual(req.reason, "Performance regression risk")

        req_empty = IncidentRejectRequest()
        self.assertIsNone(req_empty.reason)

    def test_reject_response_schema(self):
        inc_id = uuid.uuid4()
        res = IncidentRejectResponse(
            incident_id=inc_id,
            reason="Unsafe fix",
        )
        self.assertEqual(res.status, "REJECTED")
        self.assertEqual(res.incident_id, inc_id)
        self.assertEqual(res.reason, "Unsafe fix")


class TestHITLNotifications(unittest.IsolatedAsyncioTestCase):
    """Test notification dispatcher formatting for AWAITING_APPROVAL."""

    async def test_notification_dispatcher_awaiting_approval(self):
        dispatcher = NotificationDispatcher(
            slack_webhook_url="https://hooks.slack.com/services/test/test/test",
            discord_webhook_url="https://discord.com/api/webhooks/test/test",
        )
        dispatcher._send_slack = AsyncMock()
        dispatcher._send_discord = AsyncMock()

        await dispatcher.notify_awaiting_approval(
            incident_id="inc-123",
            title="ZeroDivisionError in calculate_rate",
            confidence=0.92,
            post_mortem="Detailed post-mortem summary here.",
        )

        dispatcher._send_slack.assert_awaited_once()
        slack_call = dispatcher._send_slack.call_args[1]
        self.assertEqual(slack_call["notification_type"], NotificationType.AWAITING_APPROVAL)
        self.assertEqual(slack_call["title"], "Remediation ready for review: Awaiting Approval")
        self.assertIn("92%", slack_call["fields"]["Confidence"])

        dispatcher._send_discord.assert_awaited_once()
        discord_call = dispatcher._send_discord.call_args[1]
        self.assertEqual(discord_call["notification_type"], NotificationType.AWAITING_APPROVAL)

    async def test_notifier_awaiting_approval(self):
        notifier = Notifier(
            slack_webhook_url="https://hooks.slack.com/services/test/test/test",
            discord_webhook_url="https://discord.com/api/webhooks/test/test",
        )
        notifier._post_webhook = AsyncMock()

        await notifier.notify_awaiting_approval(
            incident_id="inc-456",
            title="IndexError in parser",
            error_type="IndexError",
            confidence_score=0.88,
            summary="Proposed patch bounds check",
        )

        self.assertEqual(notifier._post_webhook.await_count, 2)
        slack_call = notifier._post_webhook.call_args_list[0]
        self.assertEqual(slack_call.args[2], "Slack")
        slack_payload = slack_call.args[1]
        self.assertEqual(slack_payload["attachments"][0]["color"], "#3498DB")


class TestHITLWorkerPipeline(unittest.IsolatedAsyncioTestCase):
    """Test closed-loop remediation pipeline under manual_approval vs autonomous mode."""

    @classmethod
    def setUpClass(cls):
        import asyncio
        from app.database import init_db
        asyncio.run(init_db())

    async def test_worker_manual_approval_mode_defers_pr(self):
        session_factory = get_session_factory()
        async with session_factory() as db:
            org = Organization(name="HITL Org", slug=f"hitl-org-{uuid.uuid4().hex[:6]}", plan_tier=PlanTier.ENTERPRISE)
            db.add(org)
            await db.flush()

            repo = Repository(
                organization_id=str(org.id),
                repo_owner="test-owner",
                repo_name="test-repo",
                remediation_mode=RemediationMode.MANUAL_APPROVAL,
            )
            db.add(repo)

            incident = Incident(
                organization_id=org.id,
                sentry_issue_id=f"ISSUE-{uuid.uuid4().hex[:6]}",
                fingerprint=uuid.uuid4().hex,
                title="HITL Test Manual Approval",
                error_type="ValueError",
                status=IncidentStatus.PENDING,
            )
            db.add(incident)
            await db.commit()
            incident_id = incident.id

        # Mock dependencies
        mock_github = MagicMock()
        mock_github.init = AsyncMock()
        mock_github.close = AsyncMock()
        mock_github.fetch_file_context = AsyncMock(return_value=MagicMock())
        mock_github.fetch_recent_blame_and_diff = AsyncMock(return_value=None)
        mock_github.fetch_full_file = AsyncMock(return_value="x = None\n")
        mock_github.create_remediation_pr = AsyncMock()

        mock_orch = MagicMock()
        remediation_out = _sample_remediation_output()
        mock_orch.generate_remediation = AsyncMock(return_value=(remediation_out, {"total_tokens": 100}))

        mock_sandbox = MagicMock()
        mock_sandbox.validate_patch = AsyncMock(
            return_value=SandboxResult(
                success=True,
                exit_code=0,
                duration_seconds=0.5,
                stdout="1 passed in 0.1s",
            )
        )

        mock_notifier = MagicMock()
        mock_notifier.notify_awaiting_approval = AsyncMock()
        mock_notifier.notify_pr_opened = AsyncMock()
        mock_notifier.notify_remediation_failed = AsyncMock()

        worker = IncidentWorker(
            github=mock_github,
            orchestrator=mock_orch,
            sandbox=mock_sandbox,
            notifier=mock_notifier,
        )

        await worker.process_incident(incident_id)

        # PR must NOT be created
        mock_github.create_remediation_pr.assert_not_called()
        mock_notifier.notify_pr_opened.assert_not_called()
        # notify_awaiting_approval MUST be called
        mock_notifier.notify_awaiting_approval.assert_awaited_once()

        # Verify DB state
        async with session_factory() as db:
            updated_inc = await worker._load_incident(db, incident_id)
            self.assertEqual(updated_inc.status, IncidentStatus.AWAITING_APPROVAL)
            self.assertIn("remediation_output", updated_inc.raw_event)
            self.assertIn("sandbox_result", updated_inc.raw_event)


class TestHITLApprovalEndpoints(unittest.TestCase):
    """Test /api/v1/incidents/{incident_id}/approve and reject REST endpoints."""

    @classmethod
    def setUpClass(cls):
        import asyncio
        from app.database import init_db
        asyncio.run(init_db())

    def setUp(self):
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

        self.test_org_id = uuid.uuid4()
        org = Organization(
            id=self.test_org_id,
            name="HITL API Org",
            slug=f"hitl-api-{uuid.uuid4().hex[:6]}",
            plan_tier=PlanTier.ENTERPRISE,
        )

        session_factory = get_session_factory()
        # Seed test org in DB
        import asyncio
        async def _seed():
            async with session_factory() as db:
                db.add(org)
                await db.commit()
        asyncio.run(_seed())

        app.dependency_overrides[get_current_tenant] = lambda: Organization(
            id=self.test_org_id,
            name="HITL API Org",
            slug="hitl-api",
            plan_tier=PlanTier.ENTERPRISE,
        )

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        app.dependency_overrides.pop(get_current_tenant, None)

    def _seed_awaiting_incident(self) -> uuid.UUID:
        session_factory = get_session_factory()
        remediation_out = _sample_remediation_output()
        inc_id = uuid.uuid4()

        incident = Incident(
            id=inc_id,
            organization_id=self.test_org_id,
            sentry_issue_id=f"ISSUE-{uuid.uuid4().hex[:6]}",
            fingerprint=uuid.uuid4().hex,
            title="Null Pointer in CheckoutService",
            error_type="NullPointerException",
            status=IncidentStatus.AWAITING_APPROVAL,
            raw_event={"remediation_output": remediation_out.model_dump()},
        )

        attempt = RemediationAttempt(
            organization_id=self.test_org_id,
            incident_id=inc_id,
            strategy="automated_fix",
            status=RemediationStatus.AWAITING_APPROVAL,
            llm_model="gpt-4o",
            analysis=remediation_out.root_cause_analysis,
            diff="--- a/app/services/example.py\n+++ b/app/services/example.py",
        )

        import asyncio
        async def _seed():
            async with session_factory() as db:
                db.add(incident)
                db.add(attempt)
                await db.commit()
        asyncio.run(_seed())
        return inc_id

    @patch("app.api.v1.incidents.GitHubService.fetch_full_file", new_callable=AsyncMock)
    @patch("app.api.v1.incidents.GitHubService.create_remediation_pr")
    @patch("app.api.v1.incidents.GitHubService.init")
    @patch("app.api.v1.incidents.GitHubService.close")
    @patch("app.api.v1.incidents.NotificationDispatcher.notify_pr_opened")
    def test_approve_incident_lifecycle(self, mock_notify, mock_close, mock_init, mock_create_pr, mock_fetch_file):
        mock_init.return_value = None
        mock_close.return_value = None
        mock_notify.return_value = None
        mock_fetch_file.return_value = "x = None\n"
        mock_create_pr.return_value = {
            "pr_url": "https://github.com/org/repo/pull/123",
            "pr_number": 123,
            "branch_name": "autoheal/fix-checkout",
        }

        inc_id = self._seed_awaiting_incident()

        response = self.client.post(f"/api/v1/incidents/{inc_id}/approve")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["id"], str(inc_id))
        self.assertEqual(data["status"], "RESOLVED")
        self.assertTrue(len(data["remediation_attempts"]) > 0)
        self.assertEqual(data["remediation_attempts"][0]["pr_url"], "https://github.com/org/repo/pull/123")
        self.assertEqual(data["remediation_attempts"][0]["status"], "PR_OPENED")

        mock_create_pr.assert_awaited_once()
        mock_notify.assert_awaited_once()

    def test_approve_incident_invalid_status_returns_400(self):
        session_factory = get_session_factory()
        inc_id = uuid.uuid4()
        incident = Incident(
            id=inc_id,
            organization_id=self.test_org_id,
            sentry_issue_id=f"ISSUE-{uuid.uuid4().hex[:6]}",
            fingerprint=uuid.uuid4().hex,
            title="Non Awaiting Incident",
            error_type="TypeError",
            status=IncidentStatus.PENDING,
        )

        import asyncio
        async def _seed():
            async with session_factory() as db:
                db.add(incident)
                await db.commit()
        asyncio.run(_seed())

        response = self.client.post(f"/api/v1/incidents/{inc_id}/approve")
        self.assertEqual(response.status_code, 400)
        self.assertIn("AWAITING_APPROVAL", response.json()["detail"])

    def test_approve_nonexistent_incident_returns_404(self):
        random_id = uuid.uuid4()
        response = self.client.post(f"/api/v1/incidents/{random_id}/approve")
        self.assertEqual(response.status_code, 404)

    def test_reject_incident_lifecycle(self):
        inc_id = self._seed_awaiting_incident()

        payload = {"reason": "Change touches deprecated API"}
        response = self.client.post(f"/api/v1/incidents/{inc_id}/reject", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "REJECTED")
        self.assertEqual(data["incident_id"], str(inc_id))
        self.assertEqual(data["reason"], "Change touches deprecated API")

        # Verify DB state
        session_factory = get_session_factory()
        import asyncio
        async def _verify():
            async with session_factory() as db:
                from sqlalchemy import select
                res = await db.execute(select(Incident).where(Incident.id == inc_id))
                refreshed = res.scalar_one()
                self.assertEqual(refreshed.status, IncidentStatus.REJECTED)
                self.assertIn("rejection_feedback", refreshed.raw_event)
                self.assertEqual(
                    refreshed.raw_event["rejection_feedback"]["reason"],
                    "Change touches deprecated API",
                )
        asyncio.run(_verify())

    def test_reject_incident_invalid_status_returns_400(self):
        session_factory = get_session_factory()
        inc_id = uuid.uuid4()
        incident = Incident(
            id=inc_id,
            organization_id=self.test_org_id,
            sentry_issue_id=f"ISSUE-{uuid.uuid4().hex[:6]}",
            fingerprint=uuid.uuid4().hex,
            title="Non Awaiting Incident",
            error_type="TypeError",
            status=IncidentStatus.RESOLVED,
        )

        import asyncio
        async def _seed():
            async with session_factory() as db:
                db.add(incident)
                await db.commit()
        asyncio.run(_seed())

        response = self.client.post(f"/api/v1/incidents/{inc_id}/reject", json={"reason": "foo"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("AWAITING_APPROVAL", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
