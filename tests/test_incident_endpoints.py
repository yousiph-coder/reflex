"""
Tests for Incident Detail, One-Click GitHub PR Merge, and Re-run Sandbox endpoints:
1. GET /api/v1/incidents/{incident_id}
2. POST /api/v1/incidents/{incident_id}/merge
3. POST /api/v1/incidents/{incident_id}/rerun
"""

import asyncio
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_tenant
from app.database import get_session_factory, init_db
from app.main import app
from app.models.incident import Incident, IncidentStatus, RemediationAttempt, RemediationStatus
from app.models.organization import Organization, PlanTier
from app.models.repository import Repository
from app.db.session import SessionLocal


@pytest.fixture
def test_setup():
    asyncio.run(init_db())
    db = SessionLocal()
    org_id = uuid.uuid4()
    org = Organization(
        id=org_id,
        name="Test Incident Org",
        slug=f"test-inc-{uuid.uuid4().hex[:6]}",
        plan_tier=PlanTier.PRO,
        is_active=True,
    )
    db.add(org)

    repo = Repository(
        id=str(uuid.uuid4()),
        organization_id=str(org_id),
        repo_owner="yousiph-coder",
        repo_name="Vireon",
        default_branch="main",
        language="javascript",
        is_private=False,
    )
    db.add(repo)

    now = datetime.now(timezone.utc)
    incident = Incident(
        organization_id=org_id,
        repository_id=repo.id,
        error_type="TypeError",
        error_message="TypeError: Cannot read properties of undefined (reading 'length') in src/counter.js",
        file_path="src/counter.js",
        status=IncidentStatus.MERGED,
        pr_url="https://github.com/yousiph-coder/Vireon/pull/3",
        branch_name="autoheal/fix-incident-745a7b31",
        created_at=now,
        resolved_at=now,
    )
    db.add(incident)
    db.commit()
    db.refresh(org)
    db.refresh(incident)

    yield {"org": org, "repo": repo, "incident": incident}

    db.delete(incident)
    db.delete(repo)
    db.delete(org)
    db.commit()
    db.close()


def test_get_incident_detail(test_setup):
    org = test_setup["org"]
    incident = test_setup["incident"]

    app.dependency_overrides[get_current_tenant] = lambda: org
    client = TestClient(app)

    try:
        response = client.get(f"/api/v1/incidents/{incident.id}")
        assert response.status_code == 200
        data = response.json()

        assert data["id"] == str(incident.id)
        assert data["error_type"] == "TypeError"
        assert data["repository_full_name"] == "yousiph-coder/Vireon"
        assert data["pr_number"] == 3
        assert data["confidence_score"] == 98.4
        assert data["severity_vitality"] == 100
        assert "Cannot read properties of undefined" in data["stack_trace"]
        assert "setupCounter" in data["original_code"] or "getCount" in data["original_code"]
        assert "setupCounter" in data["patched_code"] or "getCount" in data["patched_code"]
        assert len(data["reasoning_steps"]) == 4
        assert data["reasoning_steps"][0]["title"] == "Diagnosis & Stack Trace Isolation"
        assert data["reasoning_steps"][1]["title"] == "Root Cause Analysis"
        assert data["reasoning_steps"][2]["title"] == "Patch Strategy"
        assert data["reasoning_steps"][3]["title"] == "Docker Sandbox Verification"
    finally:
        app.dependency_overrides.pop(get_current_tenant, None)


def test_merge_incident_endpoint(test_setup):
    org = test_setup["org"]
    incident = test_setup["incident"]

    app.dependency_overrides[get_current_tenant] = lambda: org
    client = TestClient(app)

    try:
        # PR is already merged on live GitHub
        response = client.post(f"/api/v1/incidents/{incident.id}/merge")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "merged"
        assert "merged" in data["message"].lower()
        assert data["pr_url"] == incident.pr_url
    finally:
        app.dependency_overrides.pop(get_current_tenant, None)


def test_rerun_sandbox_endpoint(test_setup):
    org = test_setup["org"]
    incident = test_setup["incident"]

    app.dependency_overrides[get_current_tenant] = lambda: org
    client = TestClient(app)

    try:
        response = client.post(f"/api/v1/incidents/{incident.id}/rerun")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "merged"
        assert "Sandbox verification re-executed successfully" in data["message"]
        assert "incident" in data
        assert data["incident"]["repository_full_name"] == "yousiph-coder/Vireon"
    finally:
        app.dependency_overrides.pop(get_current_tenant, None)
