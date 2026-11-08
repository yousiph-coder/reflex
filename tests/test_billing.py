"""
Unit and integration tests for Stripe Billing, Webhooks, and Usage Paywall:
1. Billing Pydantic schemas
2. GET /api/v1/billing/usage
3. POST /api/v1/billing/create-checkout-session
4. POST /api/v1/billing/webhook (checkout.session.completed, customer.subscription.deleted)
5. Usage paywall enforcement (5 heals/month limit on free tier)
"""

import asyncio
import unittest
import uuid
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.auth import get_current_tenant, get_optional_current_user
from app.database import get_db_session, get_session_factory, init_db
from app.main import app
from app.models.incident import Incident, IncidentStatus
from app.models.organization import Organization, PlanTier
from app.models.tenant import OrganizationMember, User
from app.schemas.billing import (
    BillingWebhookResponse,
    CheckoutSessionResponse,
    UsageResponse,
)


class TestBillingSchemas(unittest.TestCase):
    """Test Billing Pydantic schemas."""

    def test_usage_response_schema_free_tier(self):
        resp = UsageResponse(plan="free", heals_used=3, limit=5)
        self.assertEqual(resp.plan, "free")
        self.assertEqual(resp.heals_used, 3)
        self.assertEqual(resp.limit, 5)

    def test_usage_response_schema_pro_tier(self):
        resp = UsageResponse(plan="pro", heals_used=12, limit=None)
        self.assertEqual(resp.plan, "pro")
        self.assertEqual(resp.heals_used, 12)
        self.assertIsNone(resp.limit)

    def test_checkout_session_response_schema(self):
        resp = CheckoutSessionResponse(checkout_url="https://checkout.stripe.com/c/pay/cs_test_123")
        self.assertEqual(resp.checkout_url, "https://checkout.stripe.com/c/pay/cs_test_123")

    def test_webhook_response_schema(self):
        resp = BillingWebhookResponse()
        self.assertEqual(resp.status, "success")
        self.assertTrue(resp.received)


class TestBillingApiEndpoints(unittest.TestCase):
    """Test Billing REST API endpoints."""

    @classmethod
    def setUpClass(cls):
        asyncio.run(init_db())
        cls.client = TestClient(app)

    def setUp(self):
        app.dependency_overrides.clear()

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_get_usage_free_plan(self):
        test_org = Organization(
            id=uuid.uuid4(),
            name="Free Test Org",
            slug=f"free-{uuid.uuid4().hex[:6]}",
            plan="free",
            plan_tier=PlanTier.FREE,
            monthly_heals_used=2,
            subscription_status="active",
        )
        app.dependency_overrides[get_current_tenant] = lambda: test_org

        response = self.client.get("/api/v1/billing/usage")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["plan"], "free")
        self.assertEqual(data["heals_used"], 2)
        self.assertEqual(data["limit"], 5)

    def test_get_usage_pro_plan(self):
        test_org = Organization(
            id=uuid.uuid4(),
            name="Pro Test Org",
            slug=f"pro-{uuid.uuid4().hex[:6]}",
            plan="pro",
            plan_tier=PlanTier.PRO,
            monthly_heals_used=14,
            subscription_status="active",
        )
        app.dependency_overrides[get_current_tenant] = lambda: test_org

        response = self.client.get("/api/v1/billing/usage")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["plan"], "pro")
        self.assertEqual(data["heals_used"], 14)
        self.assertIsNone(data["limit"])

    @patch("stripe.checkout.Session.create")
    def test_create_checkout_session(self, mock_create):
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/pay/cs_test_mock123"
        mock_create.return_value = mock_session

        org_id = uuid.uuid4()
        test_org = Organization(
            id=org_id,
            name="Checkout Org",
            slug=f"checkout-{uuid.uuid4().hex[:6]}",
            plan="free",
            plan_tier=PlanTier.FREE,
        )
        test_user = User(
            id=uuid.uuid4(),
            email="test-billing-user@example.com",
            name="Billing User",
        )

        app.dependency_overrides[get_current_tenant] = lambda: test_org
        app.dependency_overrides[get_optional_current_user] = lambda: test_user

        response = self.client.post("/api/v1/billing/create-checkout-session")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["checkout_url"], "https://checkout.stripe.com/pay/cs_test_mock123")

        # Verify stripe.checkout.Session.create arguments
        mock_create.assert_called_once()
        kwargs = mock_create.call_args.kwargs
        self.assertEqual(kwargs["customer_email"], "test-billing-user@example.com")
        self.assertEqual(kwargs["client_reference_id"], str(org_id))
        self.assertEqual(kwargs["payment_method_types"], ["card"])
        self.assertEqual(kwargs["mode"], "subscription")
        self.assertTrue("dashboard?billing=success" in kwargs["success_url"])
        self.assertTrue("dashboard?billing=canceled" in kwargs["cancel_url"])

    @patch("stripe.Webhook.construct_event")
    def test_webhook_invalid_signature_raises_400(self, mock_construct):
        import stripe
        mock_construct.side_effect = stripe.error.SignatureVerificationError("Bad signature", "sig")

        response = self.client.post(
            "/api/v1/billing/webhook",
            data=b'{"id": "evt_test"}',
            headers={"stripe-signature": "invalid_sig"},
        )
        self.assertEqual(response.status_code, 400)

    @patch("stripe.Webhook.construct_event")
    def test_webhook_checkout_session_completed_upgrades_to_pro(self, mock_construct):
        session_factory = get_session_factory()
        org_id = uuid.uuid4()

        async def _seed():
            async with session_factory() as db:
                org = Organization(
                    id=org_id,
                    name="Upgrade Test Org",
                    slug=f"upgrade-{uuid.uuid4().hex[:6]}",
                    plan="free",
                    plan_tier=PlanTier.FREE,
                    subscription_status="active",
                )
                db.add(org)
                await db.commit()

        asyncio.run(_seed())

        mock_event = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "client_reference_id": str(org_id),
                    "subscription": "sub_test_sub12345",
                    "customer": "cus_test_cust98765",
                }
            },
        }
        mock_construct.return_value = mock_event

        response = self.client.post(
            "/api/v1/billing/webhook",
            data=b'{"type": "checkout.session.completed"}',
            headers={"stripe-signature": "valid_sig"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")

        # Verify DB updated
        async def _verify():
            async with session_factory() as db:
                from sqlalchemy import select
                res = await db.execute(select(Organization).where(Organization.id == org_id))
                org = res.scalar_one()
                self.assertEqual(org.plan, "pro")
                self.assertEqual(org.stripe_subscription_id, "sub_test_sub12345")
                self.assertEqual(org.stripe_customer_id, "cus_test_cust98765")
                self.assertEqual(org.subscription_status, "active")

        asyncio.run(_verify())

    @patch("stripe.Webhook.construct_event")
    def test_webhook_customer_subscription_deleted_reverts_to_free(self, mock_construct):
        session_factory = get_session_factory()
        org_id = uuid.uuid4()
        sub_id = f"sub_del_{uuid.uuid4().hex[:8]}"

        async def _seed():
            async with session_factory() as db:
                org = Organization(
                    id=org_id,
                    name="Downgrade Test Org",
                    slug=f"downgrade-{uuid.uuid4().hex[:6]}",
                    plan="pro",
                    plan_tier=PlanTier.PRO,
                    stripe_subscription_id=sub_id,
                    subscription_status="active",
                )
                db.add(org)
                await db.commit()

        asyncio.run(_seed())

        mock_event = {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": sub_id,
                    "customer": "cus_test_customer_del",
                }
            },
        }
        mock_construct.return_value = mock_event

        response = self.client.post(
            "/api/v1/billing/webhook",
            data=b'{"type": "customer.subscription.deleted"}',
            headers={"stripe-signature": "valid_sig"},
        )
        self.assertEqual(response.status_code, 200)

        # Verify DB reverted to free
        async def _verify():
            async with session_factory() as db:
                from sqlalchemy import select
                res = await db.execute(select(Organization).where(Organization.id == org_id))
                org = res.scalar_one()
                self.assertEqual(org.plan, "free")
                self.assertEqual(org.subscription_status, "canceled")

        asyncio.run(_verify())


class TestUsagePaywallEnforcement(unittest.TestCase):
    """Test the free tier 5 heals/month limit enforcement."""

    @classmethod
    def setUpClass(cls):
        asyncio.run(init_db())
        cls.client = TestClient(app)

    def setUp(self):
        app.dependency_overrides.clear()

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_free_tier_under_limit_allowed(self):
        org = Organization(
            id=uuid.uuid4(),
            name="Allowed Org",
            slug=f"allow-{uuid.uuid4().hex[:6]}",
            plan="free",
            monthly_heals_used=4,
        )
        app.dependency_overrides[get_current_tenant] = lambda: org

        # Testing usage endpoint reflects 4/5
        response = self.client.get("/api/v1/billing/usage")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["heals_used"], 4)
        self.assertEqual(response.json()["limit"], 5)

    def test_free_tier_at_limit_blocked_with_402(self):
        org_id = uuid.uuid4()
        incident_id = uuid.uuid4()
        session_factory = get_session_factory()

        async def _seed():
            async with session_factory() as db:
                org = Organization(
                    id=org_id,
                    name="Blocked Org",
                    slug=f"block-{uuid.uuid4().hex[:6]}",
                    plan="free",
                    monthly_heals_used=5,
                )
                db.add(org)
                incident = Incident(
                    id=incident_id,
                    organization_id=org_id,
                    sentry_issue_id="ISSUE-PAYWALL-1",
                    fingerprint=f"fp-{uuid.uuid4().hex}",
                    title="Paywall Test Error",
                    error_type="ZeroDivisionError",
                    status=IncidentStatus.PENDING,
                )
                db.add(incident)
                await db.commit()

        asyncio.run(_seed())

        blocked_org = Organization(
            id=org_id,
            name="Blocked Org",
            slug="block-slug",
            plan="free",
            monthly_heals_used=5,
        )
        app.dependency_overrides[get_current_tenant] = lambda: blocked_org

        # Attempt to trigger remediation via API
        response = self.client.post(f"/api/v1/incidents/{incident_id}/remediate")
        self.assertEqual(response.status_code, 402)
        self.assertTrue("Free tier limit reached (5/5 heals)" in response.json()["detail"])

    def test_pro_tier_at_limit_not_blocked(self):
        org_id = uuid.uuid4()
        incident_id = uuid.uuid4()
        session_factory = get_session_factory()

        async def _seed():
            async with session_factory() as db:
                org = Organization(
                    id=org_id,
                    name="Pro Unlimited Org",
                    slug=f"pro-unl-{uuid.uuid4().hex[:6]}",
                    plan="pro",
                    plan_tier=PlanTier.PRO,
                    monthly_heals_used=5,
                )
                db.add(org)
                incident = Incident(
                    id=incident_id,
                    organization_id=org_id,
                    sentry_issue_id="ISSUE-PRO-1",
                    fingerprint=f"fp-{uuid.uuid4().hex}",
                    title="Pro Test Error",
                    error_type="ValueError",
                    status=IncidentStatus.PENDING,
                )
                db.add(incident)
                await db.commit()

        asyncio.run(_seed())

        pro_org = Organization(
            id=org_id,
            name="Pro Unlimited Org",
            slug="pro-unl-slug",
            plan="pro",
            plan_tier=PlanTier.PRO,
            monthly_heals_used=5,
        )
        app.dependency_overrides[get_current_tenant] = lambda: pro_org

        with patch("app.workers.incident_worker.enqueue_incident") as mock_enqueue:
            mock_enqueue.return_value = None
            response = self.client.post(f"/api/v1/incidents/{incident_id}/remediate")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "enqueued")

    def test_worker_paywall_enforcement_raises_402(self):
        org_id = uuid.uuid4()
        incident_id = uuid.uuid4()
        session_factory = get_session_factory()

        async def _seed():
            async with session_factory() as db:
                org = Organization(
                    id=org_id,
                    name="Blocked Worker Org",
                    slug=f"bw-{uuid.uuid4().hex[:6]}",
                    plan="free",
                    monthly_heals_used=5,
                )
                db.add(org)
                incident = Incident(
                    id=incident_id,
                    organization_id=org_id,
                    sentry_issue_id="ISSUE-PAYWALL-WORKER",
                    fingerprint=f"fp-{uuid.uuid4().hex}",
                    title="Worker Paywall Error",
                    error_type="TimeoutError",
                    status=IncidentStatus.PENDING,
                )
                db.add(incident)
                await db.commit()

        asyncio.run(_seed())

        from app.workers.incident_worker import IncidentWorker
        worker = IncidentWorker(
            orchestrator=MagicMock(),
            github=MagicMock(),
            sandbox=MagicMock(),
            notifier=MagicMock(),
        )

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(worker.process_incident(incident_id))

        self.assertEqual(ctx.exception.status_code, 402)
        self.assertTrue("Free tier limit reached" in ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
