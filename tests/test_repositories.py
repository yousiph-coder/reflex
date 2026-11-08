"""
Unit and integration tests for Multi-Repo backend layer:
1. Pydantic v2 schemas and validations
2. Multi-Repo API endpoints:
   - GET /api/v1/repositories
   - POST /api/v1/repositories
   - PATCH /api/v1/repositories/{id}
   - POST /api/v1/repositories/{id}/sync
   - POST /api/v1/repositories/test-sentry
   - DELETE /api/v1/repositories/{id}
"""

import unittest
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.auth import get_current_tenant
from app.main import app
from app.models.organization import Organization, PlanTier
from app.models.repository import RemediationMode
from app.schemas.repository import (
    RepositoryCreate,
    RepositoryResponse,
    RepositoryUpdate,
    SentryMappingCreate,
    SentryMappingResponse,
    SentryTestRequest,
    SentryTestResponse,
)


class TestRepositorySchemas(unittest.TestCase):
    """Test Multi-Repo Pydantic v2 schemas."""

    def test_remediation_mode_enum(self):
        self.assertEqual(RemediationMode.AUTONOMOUS.value, "autonomous")
        self.assertEqual(RemediationMode.DRAFT_PR.value, "draft_pr")
        self.assertEqual(RemediationMode.MANUAL_APPROVAL.value, "manual_approval")
        self.assertEqual(RemediationMode.DISABLED.value, "disabled")

    def test_repository_create_schema_defaults(self):
        payload = RepositoryCreate(
            repo_owner="test-owner",
            repo_name="test-repo",
        )
        self.assertEqual(payload.default_branch, "main")
        self.assertEqual(payload.language, "python")
        self.assertTrue(payload.is_private)
        self.assertEqual(payload.remediation_mode, RemediationMode.AUTONOMOUS)
        self.assertEqual(payload.test_command, "pytest -xvs tests/")
        self.assertEqual(payload.llm_model, "gpt-4o")
        self.assertEqual(payload.sentry_mappings, [])

    def test_sentry_mapping_create_schema(self):
        mapping = SentryMappingCreate(
            sentry_org_slug="org-slug",
            sentry_project_slug="proj-slug",
            environment="staging",
            path_prefix="/src",
        )
        self.assertEqual(mapping.environment, "staging")
        self.assertEqual(mapping.path_prefix, "/src")

    def test_sentry_test_schemas(self):
        req = SentryTestRequest(
            organization_slug="test-org",
            project_slug="test-proj",
        )
        self.assertEqual(req.organization_slug, "test-org")

        res = SentryTestResponse(
            success=True,
            project_id="proj_123456",
            status="active",
        )
        self.assertTrue(res.success)
        self.assertEqual(res.status, "active")


class TestRepositoryApiEndpoints(unittest.TestCase):
    """Integration tests for Repository API endpoints."""

    @classmethod
    def setUpClass(cls):
        import asyncio
        from app.database import init_db
        asyncio.run(init_db())

    def setUp(self):
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

        self.test_org_id = uuid.uuid4()
        self.test_org = Organization(
            id=self.test_org_id,
            name="Repo Test Org",
            slug=f"repo-test-{uuid.uuid4().hex[:6]}",
            plan_tier=PlanTier.PRO,
        )

        # Seed test org in DB
        from app.database import get_session_factory
        import asyncio
        session_factory = get_session_factory()

        async def _seed():
            async with session_factory() as db:
                db.add(Organization(
                    id=self.test_org_id,
                    name="Repo Test Org",
                    slug=self.test_org.slug,
                    plan_tier=PlanTier.PRO,
                ))
                await db.commit()
        asyncio.run(_seed())

        # Override tenant dependency to return our test org
        app.dependency_overrides[get_current_tenant] = lambda: self.test_org

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        app.dependency_overrides.pop(get_current_tenant, None)

    def test_list_repositories(self):
        # Fresh org with no repos returns empty list [] and 200 OK
        res = self.client.get("/api/v1/repositories")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(data, [])

    def test_create_update_sync_delete_repository_lifecycle(self):
        # 1. Create Repository with Sentry mapping
        create_payload = {
            "repo_owner": "test-owner-ci",
            "repo_name": "test-repo-ci",
            "default_branch": "main",
            "language": "python",
            "is_private": True,
            "monorepo_path": "/",
            "remediation_mode": "autonomous",
            "test_command": "pytest -v",
            "llm_model": "gpt-4o",
            "sentry_mappings": [
                {
                    "sentry_org_slug": "ci-org",
                    "sentry_project_slug": "ci-project",
                    "environment": "production",
                    "path_prefix": "/",
                }
            ],
        }
        res_create = self.client.post("/api/v1/repositories", json=create_payload)
        self.assertEqual(res_create.status_code, 201)
        created = res_create.json()
        repo_id = created["id"]
        self.assertEqual(created["repo_owner"], "test-owner-ci")
        self.assertEqual(created["repo_name"], "test-repo-ci")
        self.assertEqual(len(created["sentry_mappings"]), 1)
        self.assertEqual(created["sentry_mappings"][0]["sentry_org_slug"], "ci-org")

        # 2. Patch Repository
        patch_payload = {
            "test_command": "pytest -xvs tests/unit",
            "remediation_mode": "draft_pr",
        }
        res_patch = self.client.patch(f"/api/v1/repositories/{repo_id}", json=patch_payload)
        self.assertEqual(res_patch.status_code, 200)
        updated = res_patch.json()
        self.assertEqual(updated["test_command"], "pytest -xvs tests/unit")
        self.assertEqual(updated["remediation_mode"], "draft_pr")

        # 3. Trigger Repo Sync
        res_sync = self.client.post(f"/api/v1/repositories/{repo_id}/sync")
        self.assertEqual(res_sync.status_code, 200)
        sync_data = res_sync.json()
        self.assertEqual(sync_data["status"], "synced")
        self.assertEqual(sync_data["branch"], "main")

        # 4. Test Sentry Connection
        res_sentry = self.client.post(
            "/api/v1/repositories/test-sentry",
            json={"organization_slug": "ci-org", "project_slug": "ci-project"},
        )
        self.assertEqual(res_sentry.status_code, 200)
        sentry_data = res_sentry.json()
        self.assertTrue(sentry_data["success"])
        self.assertEqual(sentry_data["status"], "active")

        # 5. Delete Repository
        res_delete = self.client.delete(f"/api/v1/repositories/{repo_id}")
        self.assertEqual(res_delete.status_code, 204)

        # 6. Verify 404 on deleted repository
        res_not_found = self.client.patch(f"/api/v1/repositories/{repo_id}", json=patch_payload)
        self.assertEqual(res_not_found.status_code, 404)

    @patch("app.api.v1.repositories.get_installation_access_token")
    @patch("app.api.v1.repositories.get_installation_repositories")
    def test_sync_repositories_with_installation_id(self, mock_get_repos, mock_get_token):
        mock_get_token.return_value = "ghs_mock_sync_token_123"
        mock_get_repos.return_value = [
            {
                "id": 1001,
                "name": "auto-sync-repo-1",
                "full_name": "owner-ci/auto-sync-repo-1",
                "owner": {"login": "owner-ci"},
                "default_branch": "main",
                "language": "Python",
                "private": True,
            },
            {
                "id": 1002,
                "name": "auto-sync-repo-2",
                "full_name": "owner-ci/auto-sync-repo-2",
                "owner": {"login": "owner-ci"},
                "default_branch": "develop",
                "language": "TypeScript",
                "private": False,
            },
        ]

        # 1. First sync -> inserts 2 repositories and updates org.github_installation_id
        res = self.client.post(
            "/api/v1/repositories/sync",
            json={"installation_id": 12345678},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 2)
        names = [r["repo_name"] for r in data]
        self.assertIn("auto-sync-repo-1", names)
        self.assertIn("auto-sync-repo-2", names)

        # Verify tenant organization was updated with github_installation_id
        from app.database import get_session_factory
        from sqlalchemy import select
        import asyncio

        session_factory = get_session_factory()
        async def _check_org():
            async with session_factory() as db:
                org_res = await db.execute(select(Organization).where(Organization.id == self.test_org_id))
                org = org_res.scalar_one()
                self.assertEqual(org.github_installation_id, 12345678)
        asyncio.run(_check_org())

        # 2. Second sync with modified branch/language -> upserts without duplicates
        mock_get_repos.return_value = [
            {
                "id": 1001,
                "name": "auto-sync-repo-1",
                "full_name": "owner-ci/auto-sync-repo-1",
                "owner": {"login": "owner-ci"},
                "default_branch": "release-v2",
                "language": "Python",
                "private": True,
            },
        ]
        res2 = self.client.post(
            "/api/v1/repositories/sync",
            json={"installation_id": 12345678},
        )
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(len(data2), 1)
        self.assertEqual(data2[0]["repo_name"], "auto-sync-repo-1")
        self.assertEqual(data2[0]["default_branch"], "release-v2")

    @patch("app.api.v1.repositories.get_installation_access_token")
    @patch("app.api.v1.repositories.get_installation_repositories")
    def test_trailing_slash_variants_and_fallback(self, mock_get_repos, mock_get_token):
        mock_get_token.return_value = "ghs_test_token"
        mock_get_repos.return_value = []

        # 1. GET with trailing slash
        res_get_slash = self.client.get("/api/v1/repositories/")
        self.assertEqual(res_get_slash.status_code, 200)
        self.assertIsInstance(res_get_slash.json(), list)

        # 2. POST /sync with trailing slash
        res_sync_slash = self.client.post("/api/v1/repositories/sync/", json={"installation_id": 99999})
        self.assertEqual(res_sync_slash.status_code, 200)

        # 3. POST fallback to /repositories and /repositories/
        res_fallback = self.client.post("/api/v1/repositories", json={"installation_id": 99999})
        self.assertEqual(res_fallback.status_code, 200)

        res_fallback_slash = self.client.post("/api/v1/repositories/", json={"installation_id": 99999})
        self.assertEqual(res_fallback_slash.status_code, 200)

        # 4. POST fallback with empty json
        res_empty = self.client.post("/api/v1/repositories", json={})
        self.assertEqual(res_empty.status_code, 200)


if __name__ == "__main__":
    unittest.main()
