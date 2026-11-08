"""
Tests for Slack & Discord Webhook Notification Integrations:
1. build_discord_payload (0x10B981 color, structure, fields)
2. build_slack_payload (Block Kit sections, buttons, context)
3. send_remediation_alert (URL validation, delivery to Discord / Slack)
4. dispatch_tenant_notifications (tenant-scoped delivery & alerts_enabled toggle)
5. GET /api/v1/settings/notifications
6. POST /api/v1/settings/notifications
7. POST /api/v1/settings/notifications/test
"""

import asyncio
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_tenant
from app.database import init_db
from app.db.session import SessionLocal
from app.main import app
from app.models.organization import Organization, PlanTier
from app.services.notifications import (
    build_discord_payload,
    build_slack_payload,
    dispatch_tenant_notifications,
    send_remediation_alert,
)


@pytest.fixture
def notification_test_setup():
    asyncio.run(init_db())
    db = SessionLocal()
    org_id = uuid.uuid4()
    org = Organization(
        id=org_id,
        name="Notification Test Org",
        slug=f"notif-org-{uuid.uuid4().hex[:6]}",
        plan_tier=PlanTier.PRO,
        is_active=True,
        discord_webhook_url=None,
        slack_webhook_url=None,
        alerts_enabled=True,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    db.close()

    app.dependency_overrides[get_current_tenant] = lambda: org
    yield org
    app.dependency_overrides.clear()


def test_build_discord_payload():
    """Verify Discord payload matches the exact schema and 0x10B981 color."""
    payload = build_discord_payload({
        "repository": "yousiph-coder/Vireon",
        "exception": "TypeError in src/counter.js",
        "sandbox": "✅ 14/14 Tests Passed (38s MTTR)",
        "pr_url": "https://github.com/yousiph-coder/Vireon/pull/3",
        "pr_number": 3,
        "hours_saved": 2.5,
        "cost_saved": 163,
    })

    assert payload["username"] == "AutoHeal AI — Autonomous SRE"
    assert len(payload["embeds"]) == 1
    embed = payload["embeds"][0]
    assert embed["color"] == 1096065  # 0x10B981 Neon Emerald
    assert "Autonomous Fix Verified" in embed["title"]

    field_dict = {f["name"]: f["value"] for f in embed["fields"]}
    assert field_dict["Repository"] == "`yousiph-coder/Vireon`"
    assert field_dict["Exception"] == "`TypeError in src/counter.js`"
    assert "✅ 14/14 Tests Passed" in field_dict["Sandbox Verification"]
    assert "Review & Merge PR #3" in field_dict["Pull Request"]
    assert "https://github.com/yousiph-coder/Vireon/pull/3" in field_dict["Pull Request"]
    assert "2.5 eng hours ($163)" in embed["footer"]["text"]


def test_build_slack_payload():
    """Verify Slack payload constructs clean Block Kit with action button."""
    payload = build_slack_payload({
        "repository": "yousiph-coder/Vireon",
        "exception": "TypeError in src/counter.js",
        "sandbox": "✅ 14/14 Tests Passed (38s MTTR)",
        "pr_url": "https://github.com/yousiph-coder/Vireon/pull/3",
        "pr_number": 3,
    })

    assert "text" in payload
    blocks = payload["blocks"]
    types = [b["type"] for b in blocks]
    assert "header" in types
    assert "section" in types
    assert "actions" in types
    assert "context" in types

    action_block = next(b for b in blocks if b["type"] == "actions")
    button = action_block["elements"][0]
    assert button["type"] == "button"
    assert button["url"] == "https://github.com/yousiph-coder/Vireon/pull/3"


def test_send_remediation_alert_validation():
    """Test URL scheme validation and error handling."""
    async def _run():
        with pytest.raises(ValueError, match="Invalid webhook URL scheme"):
            await send_remediation_alert("invalid-url-without-scheme")

        with pytest.raises(ValueError, match="non-empty string"):
            await send_remediation_alert("")

    asyncio.run(_run())


def test_send_remediation_alert_discord():
    """Test dispatching alert to Discord webhook URL with mocked HTTP POST."""
    async def _run():
        fake_url = "https://discord.com/api/webhooks/12345/abcdef"

        mock_resp = AsyncMock()
        mock_resp.status_code = 204
        mock_resp.text = ""

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            res = await send_remediation_alert(fake_url)

            assert res["status"] == "sent"
            assert res["channel"] == "discord"
            assert mock_post.called
            call_kwargs = mock_post.call_args.kwargs
            assert call_kwargs["json"]["username"] == "AutoHeal AI — Autonomous SRE"

    asyncio.run(_run())


def test_send_remediation_alert_slack():
    """Test dispatching alert to Slack webhook URL with mocked HTTP POST."""
    async def _run():
        fake_url = "https://hooks.slack.com/services/T00/B00/XXXX"

        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.text = "ok"

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            res = await send_remediation_alert(fake_url)

            assert res["status"] == "sent"
            assert res["channel"] == "slack"
            assert mock_post.called
            call_kwargs = mock_post.call_args.kwargs
            assert "blocks" in call_kwargs["json"]

    asyncio.run(_run())


def test_dispatch_tenant_notifications():
    """Test that dispatch honors alerts_enabled toggle and dispatches to configured URLs."""
    async def _run():
        org = Organization(
            id=uuid.uuid4(),
            name="Dispatch Org",
            slug="dispatch-org",
            discord_webhook_url="https://discord.com/api/webhooks/999/test",
            slack_webhook_url="https://hooks.slack.com/services/999/test",
            alerts_enabled=True,
        )

        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.text = "ok"

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            results = await dispatch_tenant_notifications(org)
            assert len(results) == 2
            assert mock_post.call_count == 2

        # Now disable alerts
        org.alerts_enabled = False
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            results = await dispatch_tenant_notifications(org)
            assert len(results) == 0
            assert not mock_post.called

    asyncio.run(_run())


def test_settings_api_lifecycle(notification_test_setup):
    """Test GET, POST and POST /test settings endpoints."""
    org = notification_test_setup
    client = TestClient(app)

    # 1. GET notifications settings
    get_res = client.get("/api/v1/settings/notifications")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["discord_webhook_url"] is None
    assert data["slack_webhook_url"] is None
    assert data["alerts_enabled"] is True

    # 2. POST update notifications settings
    discord_url = "https://discord.com/api/webhooks/777/test"
    slack_url = "https://hooks.slack.com/services/888/test"
    update_res = client.post(
        "/api/v1/settings/notifications",
        json={
            "discord_webhook_url": discord_url,
            "slack_webhook_url": slack_url,
            "alerts_enabled": True,
        },
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["discord_webhook_url"] == discord_url
    assert updated_data["slack_webhook_url"] == slack_url

    # 3. POST /test with invalid URL
    bad_test = client.post(
        "/api/v1/settings/notifications/test",
        json={"webhook_url": "ftp://bad-url"},
    )
    assert bad_test.status_code == 400

    # 4. POST /test with valid webhook URL
    mock_resp = AsyncMock()
    mock_resp.status_code = 204
    mock_resp.text = ""

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        good_test = client.post(
            "/api/v1/settings/notifications/test",
            json={"webhook_url": discord_url},
        )
        assert good_test.status_code == 200
        test_data = good_test.json()
        assert test_data["status"] == "sent"
        assert "Live alert delivered" in test_data["message"]
