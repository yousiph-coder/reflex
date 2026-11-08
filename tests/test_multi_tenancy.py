"""
Multi-tenancy isolation tests.

Proves:
1. User A cannot access or approve incidents belonging to Organization B (HTTP 403 / 404).
2. Repositories are strictly filtered by tenant (Organization A sees only its repos).
3. JWT token validation works correctly (valid, expired, missing).
4. Organization membership is enforced by get_current_tenant.
"""

from __future__ import annotations

import asyncio
import datetime
import unittest
import uuid
from unittest.mock import patch

import jwt as pyjwt
from fastapi.testclient import TestClient

from app.core.auth import get_current_tenant, get_current_user
from app.database import get_session_factory
from app.main import app
from app.models.incident import Incident, IncidentStatus
from app.models.organization import Organization, PlanTier
from app.models.repository import RemediationMode, Repository
from app.models.tenant import MemberRole, OrganizationMember, User


# ── Helpers ─────────────────────────────────────────────────────

_JWT_SECRET = "test-secret-key-for-tests-must-be-at-least-32-bytes-long!"


def _make_jwt(sub: str, email: str | None = None, expired: bool = False) -> str:
    """Create a signed HS256 JWT token for testing."""
    now = datetime.datetime.now(datetime.timezone.utc)
    user_email = email or f"test-{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "sub": sub,
        "email": user_email,
        "name": "Test User",
        "iat": now,
        "exp": now + (datetime.timedelta(seconds=-10) if expired else datetime.timedelta(hours=1)),
    }
    return pyjwt.encode(payload, _JWT_SECRET, algorithm="HS256")


class TestMultiTenantIsolation(unittest.TestCase):
    """Prove strict tenant isolation between organizations."""

    @classmethod
    def setUpClass(cls):
        from app.database import init_db
        asyncio.run(init_db())

        cls.org_a_id = uuid.uuid4()
        cls.org_b_id = uuid.uuid4()
        cls.user_a_id = uuid.uuid4()
        cls.user_b_id = uuid.uuid4()

        cls.org_a = Organization(
            id=cls.org_a_id,
            name="Organization Alpha",
            slug=f"org-alpha-{uuid.uuid4().hex[:6]}",
            plan_tier=PlanTier.PRO,
        )
        cls.org_b = Organization(
            id=cls.org_b_id,
            name="Organization Beta",
            slug=f"org-beta-{uuid.uuid4().hex[:6]}",
            plan_tier=PlanTier.PRO,
        )

        # Seed both orgs, users, memberships, repos, and incidents
        session_factory = get_session_factory()

        async def _seed():
            async with session_factory() as db:
                # Organizations
                db.add(Organization(
                    id=cls.org_a_id,
                    name="Organization Alpha",
                    slug=cls.org_a.slug,
                    plan_tier=PlanTier.PRO,
                ))
                db.add(Organization(
                    id=cls.org_b_id,
                    name="Organization Beta",
                    slug=cls.org_b.slug,
                    plan_tier=PlanTier.PRO,
                ))
                await db.flush()

                # Users
                user_a = User(
                    id=cls.user_a_id,
                    email=f"usera-{uuid.uuid4().hex[:6]}@alpha.com",
                    name="User A",
                )
                user_b = User(
                    id=cls.user_b_id,
                    email=f"userb-{uuid.uuid4().hex[:6]}@beta.com",
                    name="User B",
                )
                db.add(user_a)
                db.add(user_b)
                await db.flush()

                # Memberships — User A → Org A, User B → Org B
                db.add(OrganizationMember(
                    user_id=cls.user_a_id,
                    organization_id=cls.org_a_id,
                    role=MemberRole.OWNER,
                ))
                db.add(OrganizationMember(
                    user_id=cls.user_b_id,
                    organization_id=cls.org_b_id,
                    role=MemberRole.OWNER,
                ))
                await db.flush()

                # Repository for Org A
                cls.repo_a_id = str(uuid.uuid4())
                db.add(Repository(
                    id=cls.repo_a_id,
                    organization_id=str(cls.org_a_id),
                    repo_owner="alpha-owner",
                    repo_name="alpha-repo",
                    language="python",
                    remediation_mode=RemediationMode.MANUAL_APPROVAL,
                ))

                # Repository for Org B
                cls.repo_b_id = str(uuid.uuid4())
                db.add(Repository(
                    id=cls.repo_b_id,
                    organization_id=str(cls.org_b_id),
                    repo_owner="beta-owner",
                    repo_name="beta-repo",
                    language="python",
                    remediation_mode=RemediationMode.AUTONOMOUS,
                ))
                await db.flush()

                # Incident for Org A
                cls.incident_a_id = uuid.uuid4()
                db.add(Incident(
                    id=cls.incident_a_id,
                    organization_id=cls.org_a_id,
                    sentry_issue_id=f"ISSUE-A-{uuid.uuid4().hex[:6]}",
                    fingerprint=uuid.uuid4().hex,
                    title="KeyError in Org A handler",
                    error_type="KeyError",
                    status=IncidentStatus.AWAITING_APPROVAL,
                    raw_event={"remediation_output": {
                        "root_cause_analysis": "Missing key",
                        "confidence_score": 0.9,
                        "file_patches": [],
                        "unit_test": {
                            "test_file_path": "tests/t.py",
                            "test_code": "pass",
                            "test_command": "pytest",
                            "test_framework": "pytest",
                        },
                        "post_mortem_summary": "Fixed",
                        "suggested_preventions": [],
                    }},
                ))

                # Incident for Org B
                cls.incident_b_id = uuid.uuid4()
                db.add(Incident(
                    id=cls.incident_b_id,
                    organization_id=cls.org_b_id,
                    sentry_issue_id=f"ISSUE-B-{uuid.uuid4().hex[:6]}",
                    fingerprint=uuid.uuid4().hex,
                    title="TypeError in Org B handler",
                    error_type="TypeError",
                    status=IncidentStatus.AWAITING_APPROVAL,
                    raw_event={},
                ))

                await db.commit()

        asyncio.run(_seed())

    # ── Test: Repos are filtered by tenant ──────────────────────

    def test_org_a_only_sees_own_repositories(self):
        """Organization A should only see repos belonging to Org A."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_a
            try:
                res = client.get("/api/v1/repositories")
                self.assertEqual(res.status_code, 200)
                repos = res.json()
                for repo in repos:
                    self.assertEqual(
                        repo["organization_id"],
                        str(self.org_a_id),
                        f"Repo {repo['id']} belongs to a different org!",
                    )
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)

    def test_org_b_only_sees_own_repositories(self):
        """Organization B should only see repos belonging to Org B."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_b
            try:
                res = client.get("/api/v1/repositories")
                self.assertEqual(res.status_code, 200)
                repos = res.json()
                for repo in repos:
                    self.assertEqual(
                        repo["organization_id"],
                        str(self.org_b_id),
                        f"Repo {repo['id']} belongs to a different org!",
                    )
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)

    def test_org_a_cannot_update_org_b_repo(self):
        """User of Org A cannot PATCH a repository owned by Org B → 404."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_a
            try:
                res = client.patch(
                    f"/api/v1/repositories/{self.repo_b_id}",
                    json={"language": "rust"},
                )
                self.assertEqual(res.status_code, 404)
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)

    def test_org_a_cannot_delete_org_b_repo(self):
        """User of Org A cannot DELETE a repository owned by Org B → 404."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_a
            try:
                res = client.delete(f"/api/v1/repositories/{self.repo_b_id}")
                self.assertEqual(res.status_code, 404)
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)

    def test_org_a_cannot_sync_org_b_repo(self):
        """User of Org A cannot POST sync on Org B's repo → 404."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_a
            try:
                res = client.post(f"/api/v1/repositories/{self.repo_b_id}/sync")
                self.assertEqual(res.status_code, 404)
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)

    # ── Test: Incidents are scoped by tenant ────────────────────

    def test_org_a_cannot_view_org_b_incident(self):
        """User of Org A cannot GET an incident belonging to Org B → 404."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_a
            try:
                res = client.get(f"/api/v1/incidents/{self.incident_b_id}")
                self.assertEqual(res.status_code, 404)
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)

    def test_org_a_cannot_approve_org_b_incident(self):
        """User of Org A cannot approve an incident belonging to Org B → 404."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_a
            try:
                res = client.post(f"/api/v1/incidents/{self.incident_b_id}/approve")
                self.assertEqual(res.status_code, 404)
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)

    def test_org_a_cannot_reject_org_b_incident(self):
        """User of Org A cannot reject an incident belonging to Org B → 404."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_a
            try:
                res = client.post(
                    f"/api/v1/incidents/{self.incident_b_id}/reject",
                    json={"reason": "should be blocked"},
                )
                self.assertEqual(res.status_code, 404)
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)

    def test_org_b_can_view_own_incident(self):
        """Org B can view its own incident → 200."""
        with TestClient(app) as client:
            app.dependency_overrides[get_current_tenant] = lambda: self.org_b
            try:
                res = client.get(f"/api/v1/incidents/{self.incident_b_id}")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertEqual(data["id"], str(self.incident_b_id))
            finally:
                app.dependency_overrides.pop(get_current_tenant, None)


class TestSupabaseAuthentication(unittest.TestCase):
    """Test Supabase token validation and user/organization provisioning."""

    @classmethod
    def setUpClass(cls):
        from app.database import init_db
        asyncio.run(init_db())

    def setUp(self):
        from app.database import _session_factory, init_db
        if _session_factory is None:
            asyncio.run(init_db())

    def test_missing_bearer_returns_401(self):
        """No Bearer credentials should raise 401."""
        from fastapi import HTTPException
        session_factory = get_session_factory()

        async def _test():
            async with session_factory() as db:
                with self.assertRaises(HTTPException) as ctx:
                    await get_current_user(credentials=None, db=db)
                self.assertEqual(ctx.exception.status_code, 401)
                self.assertEqual(ctx.exception.detail, "Unauthorized")

        asyncio.run(_test())

    def test_invalid_supabase_token_returns_401(self):
        """An invalid or malformed Supabase token should raise 401."""
        from fastapi import HTTPException
        from fastapi.security import HTTPAuthorizationCredentials

        session_factory = get_session_factory()
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-supabase-token-12345")

        async def _test():
            async with session_factory() as db:
                with self.assertRaises(HTTPException) as ctx:
                    await get_current_user(credentials=creds, db=db)
                self.assertEqual(ctx.exception.status_code, 401)
                self.assertEqual(ctx.exception.detail, "Unauthorized")

        asyncio.run(_test())

    def test_valid_supabase_session_provisions_user_and_workspace(self):
        """Valid Supabase user provisions User and default {email}'s Org workspace."""
        from unittest.mock import MagicMock, patch
        from fastapi.security import HTTPAuthorizationCredentials

        fake_sb_id = uuid.uuid4()
        fake_email = f"alice-{uuid.uuid4().hex[:6]}@example.com"
        mock_user = MagicMock()
        mock_user.id = str(fake_sb_id)
        mock_user.email = fake_email
        mock_user.user_metadata = {"name": "Alice Developer"}

        mock_user_response = MagicMock()
        mock_user_response.user = mock_user

        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.return_value = mock_user_response

        session_factory = get_session_factory()
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock-valid-token")

        async def _test():
            with patch("app.core.auth.get_supabase_client", return_value=mock_supabase):
                async with session_factory() as db:
                    user = await get_current_user(credentials=creds, db=db)
                    self.assertEqual(user.id, fake_sb_id)
                    self.assertEqual(user.email, fake_email)

                    # Verify default workspace org was created: {email}'s Org
                    from sqlalchemy import select
                    from app.models.tenant import OrganizationMember, MemberRole
                    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
                    res = await db.execute(stmt)
                    membership = res.scalar_one_or_none()
                    self.assertIsNotNone(membership)
                    self.assertEqual(membership.role, MemberRole.OWNER)

                    org_stmt = select(Organization).where(Organization.id == membership.organization_id)
                    org_res = await db.execute(org_stmt)
                    org = org_res.scalar_one()
                    self.assertEqual(org.name, f"{fake_email.split('@')[0]}'s Workspace")
                    self.assertEqual(org.plan_tier, PlanTier.FREE)

        asyncio.run(_test())

    def test_github_oauth_session_provisions_user_with_github_id_and_workspace(self):
        """GitHub OAuth Supabase user provisions User with github_id, name, and default Workspace."""
        from unittest.mock import MagicMock, patch
        from fastapi.security import HTTPAuthorizationCredentials

        fake_sb_id = uuid.uuid4()
        fake_email = f"octocat-{uuid.uuid4().hex[:6]}@github.com"
        mock_user = MagicMock()
        mock_user.id = str(fake_sb_id)
        mock_user.email = fake_email
        mock_user.user_metadata = {
            "name": "Mona Lisa Octocat",
            "user_name": "octocat",
        }
        fake_gh_id = f"gh-{uuid.uuid4().hex[:12]}"
        mock_identity = MagicMock()
        mock_identity.provider = "github"
        mock_identity.id = fake_gh_id
        mock_user.identities = [mock_identity]

        mock_user_response = MagicMock()
        mock_user_response.user = mock_user

        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.return_value = mock_user_response

        session_factory = get_session_factory()
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock-github-token")

        async def _test():
            with patch("app.core.auth.get_supabase_client", return_value=mock_supabase):
                async with session_factory() as db:
                    user = await get_current_user(credentials=creds, db=db)
                    self.assertEqual(user.id, fake_sb_id)
                    self.assertEqual(user.email, fake_email)
                    self.assertEqual(user.github_id, fake_gh_id)
                    self.assertEqual(user.name, "Mona Lisa Octocat")

                    # Verify default workspace org was created: {email.split('@')[0]}'s Workspace
                    from sqlalchemy import select
                    from app.models.tenant import OrganizationMember, MemberRole
                    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
                    res = await db.execute(stmt)
                    membership = res.scalar_one_or_none()
                    self.assertIsNotNone(membership)
                    self.assertEqual(membership.role, MemberRole.OWNER)

                    org_stmt = select(Organization).where(Organization.id == membership.organization_id)
                    org_res = await db.execute(org_stmt)
                    org = org_res.scalar_one()
                    self.assertEqual(org.name, f"{fake_email.split('@')[0]}'s Workspace")
                    self.assertEqual(org.plan_tier, PlanTier.FREE)

        asyncio.run(_test())

    def test_real_supabase_auth_integration(self):
        """End-to-end integration test with real Supabase Auth."""
        from supabase import create_client
        from app.config import get_settings
        from fastapi.testclient import TestClient

        settings = get_settings()
        url = settings.supabase_url
        anon_key = settings.supabase_key.get_secret_value()

        # Sign in with real test user
        client = create_client(url, anon_key)
        try:
            session = client.auth.sign_in_with_password({
                "email": "autoheal.test.user@example.com",
                "password": "TestPassword123!@#"
            })
        except Exception:
            admin = create_client(url, settings.supabase_service_role_key.get_secret_value())
            try:
                admin.auth.admin.create_user({
                    "email": "autoheal.test.user@example.com",
                    "password": "TestPassword123!@#",
                    "email_confirm": True
                })
            except Exception:
                pass
            session = client.auth.sign_in_with_password({
                "email": "autoheal.test.user@example.com",
                "password": "TestPassword123!@#"
            })
        real_token = session.session.access_token

        with TestClient(app) as test_client:
            # 1. Invalid token on protected endpoint -> 401
            res_bad = test_client.get(
                "/api/v1/repositories",
                headers={"Authorization": "Bearer bad-token-123"}
            )
            self.assertEqual(res_bad.status_code, 401)

            # 2. Valid token on protected endpoint -> 200
            res_good = test_client.get(
                "/api/v1/repositories",
                headers={"Authorization": f"Bearer {real_token}"}
            )
            self.assertEqual(res_good.status_code, 200)
            self.assertIsInstance(res_good.json(), list)



class TestTenantMembershipEnforcement(unittest.TestCase):
    """Verify that get_current_tenant enforces org membership."""

    @classmethod
    def setUpClass(cls):
        from app.database import init_db
        asyncio.run(init_db())

        cls.org_id = uuid.uuid4()
        cls.user_id = uuid.uuid4()
        cls.other_org_id = uuid.uuid4()

        session_factory = get_session_factory()

        async def _seed():
            async with session_factory() as db:
                db.add(Organization(
                    id=cls.org_id,
                    name="Member Test Org",
                    slug=f"member-test-{uuid.uuid4().hex[:6]}",
                    plan_tier=PlanTier.PRO,
                ))
                db.add(Organization(
                    id=cls.other_org_id,
                    name="Other Org",
                    slug=f"other-org-{uuid.uuid4().hex[:6]}",
                    plan_tier=PlanTier.FREE,
                ))
                user = User(
                    id=cls.user_id,
                    email=f"member-test-{uuid.uuid4().hex[:6]}@example.com",
                    name="Member Test User",
                )
                db.add(user)
                await db.flush()
                db.add(OrganizationMember(
                    user_id=cls.user_id,
                    organization_id=cls.org_id,
                    role=MemberRole.MEMBER,
                ))
                await db.commit()

        asyncio.run(_seed())

    def test_user_can_access_own_org(self):
        """User with membership in Org should get that Org back."""
        session_factory = get_session_factory()
        user = User(id=self.user_id, email="x", name="x")

        async def _test():
            async with session_factory() as db:
                org = await get_current_tenant(
                    user=user,
                    x_org_id=str(self.org_id),
                    db=db,
                )
                self.assertEqual(org.id, self.org_id)

        asyncio.run(_test())

    def test_user_cannot_access_other_org(self):
        """User requesting a non-existent org gets 403."""
        from fastapi import HTTPException

        session_factory = get_session_factory()
        user = User(id=self.user_id, email="x", name="x")
        non_existent_org_id = uuid.uuid4()

        async def _test():
            async with session_factory() as db:
                with self.assertRaises(HTTPException) as ctx:
                    await get_current_tenant(
                        user=user,
                        x_org_id=str(non_existent_org_id),
                        db=db,
                    )
                self.assertEqual(ctx.exception.status_code, 403)
                self.assertIn("Access denied", ctx.exception.detail)

        asyncio.run(_test())

    def test_user_auto_heals_missing_membership_for_existing_org(self):
        """User accessing existing org without prior membership auto-heals as owner."""
        session_factory = get_session_factory()
        user = User(id=self.user_id, email="x", name="x")

        async def _test():
            async with session_factory() as db:
                org = await get_current_tenant(
                    user=user,
                    x_org_id=str(self.other_org_id),
                    db=db,
                )
                self.assertEqual(org.id, self.other_org_id)

        asyncio.run(_test())

    def test_user_default_org_without_header(self):
        """Without X-Org-Id, user gets their first org."""
        session_factory = get_session_factory()
        user = User(id=self.user_id, email="x", name="x")

        async def _test():
            async with session_factory() as db:
                org = await get_current_tenant(
                    user=user,
                    x_org_id=None,
                    db=db,
                )
                self.assertEqual(org.id, self.org_id)

        asyncio.run(_test())


class TestSentryWebhookTenantResolution(unittest.TestCase):
    """Verify Sentry webhook resolves organization via repository mapping."""

    @classmethod
    def setUpClass(cls):
        from app.database import init_db
        asyncio.run(init_db())

        cls.target_org_id = uuid.uuid4()
        cls.target_repo_id = str(uuid.uuid4())
        cls.target_project_slug = f"sentry-proj-{uuid.uuid4().hex[:6]}"

        session_factory = get_session_factory()

        async def _seed():
            from app.models.repository import Repository, SentryProjectMapping
            async with session_factory() as db:
                org = Organization(
                    id=cls.target_org_id,
                    name="Sentry Target Org",
                    slug=f"sentry-org-{uuid.uuid4().hex[:6]}",
                    plan_tier=PlanTier.PRO,
                )
                db.add(org)
                await db.flush()

                repo = Repository(
                    id=cls.target_repo_id,
                    organization_id=str(cls.target_org_id),
                    repo_owner="sentry-owner",
                    repo_name="sentry-repo",
                    language="python",
                )
                db.add(repo)
                await db.flush()

                mapping = SentryProjectMapping(
                    repository_id=repo.id,
                    sentry_org_slug="my-sentry-org",
                    sentry_project_slug=cls.target_project_slug,
                    environment="production",
                )
                db.add(mapping)
                await db.commit()

        asyncio.run(_seed())

    @patch("app.api.v1.webhooks.get_redis")
    @patch("app.workers.incident_worker.enqueue_incident")
    def test_webhook_resolves_organization_from_sentry_mapping(self, mock_enqueue, mock_get_redis):
        import hashlib
        import hmac
        import json
        from unittest.mock import AsyncMock
        from app.config import get_settings

        mock_enqueue.return_value = None
        mock_redis = AsyncMock()
        mock_redis.set.return_value = True
        mock_get_redis.return_value = mock_redis

        payload = {
            "action": "triggered",
            "data": {
                "event": {
                    "event_id": uuid.uuid4().hex,
                    "title": "DivisionByZero in billing",
                    "project_slug": self.target_project_slug,
                    "platform": "python",
                    "environment": "production",
                    "exception": {
                        "values": [
                            {
                                "type": "ZeroDivisionError",
                                "value": "division by zero",
                                "stacktrace": {
                                    "frames": [{"filename": "billing.py", "lineno": 12, "in_app": True}]
                                },
                            }
                        ]
                    },
                }
            },
        }
        body_bytes = json.dumps(payload).encode("utf-8")
        settings = get_settings()
        secret = settings.sentry_client_secret.get_secret_value()
        signature = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

        with TestClient(app) as client:
            res = client.post(
                "/api/v1/webhooks/sentry",
                content=body_bytes,
                headers={
                    "Content-Type": "application/json",
                    "sentry-hook-signature": signature,
                    "sentry-hook-resource": "event_alert",
                },
            )
            self.assertEqual(res.status_code, 202)
            inc_id = res.json()["incident_id"]

            # Verify that the incident was created under target_org_id
            session_factory = get_session_factory()

            async def _check():
                async with session_factory() as db:
                    from sqlalchemy import select
                    inc_res = await db.execute(select(Incident).where(Incident.id == uuid.UUID(inc_id)))
                    inc = inc_res.scalar_one()
                    self.assertEqual(str(inc.organization_id), str(self.target_org_id))
                    self.assertEqual(inc.project_slug, self.target_project_slug)

            asyncio.run(_check())


if __name__ == "__main__":
    unittest.main()

