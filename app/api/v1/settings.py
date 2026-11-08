"""
API endpoints for tenant settings and notification integrations.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_tenant
from app.database import get_db_session
from app.models.tenant import Organization
from app.schemas.settings import (
    NotificationSettingsResponse,
    NotificationSettingsUpdate,
    NotificationTestRequest,
    NotificationTestResponse,
)
from app.services.notifications import send_remediation_alert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get(
    "/notifications",
    response_model=NotificationSettingsResponse,
    summary="Get tenant notification settings",
)
async def get_notification_settings(
    org: Organization = Depends(get_current_tenant),
) -> NotificationSettingsResponse:
    """Retrieve current Discord and Slack webhook URLs and alerts state."""
    return NotificationSettingsResponse(
        discord_webhook_url=org.discord_webhook_url,
        slack_webhook_url=org.slack_webhook_url,
        alerts_enabled=org.alerts_enabled if org.alerts_enabled is not None else True,
    )


@router.post(
    "/notifications",
    response_model=NotificationSettingsResponse,
    summary="Update tenant notification settings",
)
async def update_notification_settings(
    payload: NotificationSettingsUpdate,
    org: Organization = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db_session),
) -> NotificationSettingsResponse:
    """Save or clear Discord and Slack webhook URLs for the authenticated organization."""
    if payload.discord_webhook_url is not None:
        val = payload.discord_webhook_url.strip()
        org.discord_webhook_url = val if val else None

    if payload.slack_webhook_url is not None:
        val = payload.slack_webhook_url.strip()
        org.slack_webhook_url = val if val else None

    if payload.alerts_enabled is not None:
        org.alerts_enabled = payload.alerts_enabled

    org.updated_at = datetime.now(timezone.utc)
    db.add(org)
    await db.commit()
    await db.refresh(org)

    logger.info(
        "Updated notification settings for org %s (discord=%s, slack=%s, alerts_enabled=%s)",
        org.id,
        bool(org.discord_webhook_url),
        bool(org.slack_webhook_url),
        org.alerts_enabled,
    )

    return NotificationSettingsResponse(
        discord_webhook_url=org.discord_webhook_url,
        slack_webhook_url=org.slack_webhook_url,
        alerts_enabled=org.alerts_enabled if org.alerts_enabled is not None else True,
    )


@router.post(
    "/notifications/test",
    response_model=NotificationTestResponse,
    summary="Dispatch live test notification to webhook",
)
async def test_notification_webhook(
    payload: NotificationTestRequest,
    org: Organization = Depends(get_current_tenant),
) -> NotificationTestResponse:
    """Dispatch a live test alert to verify Slack or Discord webhook delivery."""
    url = (payload.webhook_url or "").strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook URL. Must start with http:// or https://",
        )

    try:
        await send_remediation_alert(
            webhook_url=url,
            payload_data={
                "repository": "yousiph-coder/Vireon",
                "exception": "TypeError in src/counter.js",
                "sandbox": "✅ 14/14 Tests Passed (38s MTTR)",
                "pr_url": "https://github.com/yousiph-coder/Vireon/pull/3",
                "pr_number": 3,
                "hours_saved": 2.5,
                "cost_saved": 163,
            },
        )
        return NotificationTestResponse(
            status="sent",
            message="Live alert delivered to your channel!",
        )
    except Exception as exc:
        logger.warning(
            "Test alert to %s by org %s failed: %s",
            url,
            org.id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook test failed: {exc!s}",
        )
