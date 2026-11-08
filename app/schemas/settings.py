"""
Pydantic schemas for tenant notification settings and webhook alerts.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class NotificationSettingsResponse(BaseModel):
    """Current notification channel configurations for an organization."""

    discord_webhook_url: Optional[str] = Field(
        default=None,
        description="Configured Discord incoming webhook URL",
        examples=["https://discord.com/api/webhooks/123456789/abcdef"],
    )
    slack_webhook_url: Optional[str] = Field(
        default=None,
        description="Configured Slack incoming webhook URL",
        examples=["https://hooks.slack.com/services/T000/B000/XXXX"],
    )
    alerts_enabled: bool = Field(
        default=True,
        description="Whether webhook alerts are actively dispatched on remediation",
    )

    model_config = {"from_attributes": True}


class NotificationSettingsUpdate(BaseModel):
    """Payload for updating organization notification channels."""

    discord_webhook_url: Optional[str] = Field(
        default=None,
        description="Discord incoming webhook URL (pass empty string to clear)",
    )
    slack_webhook_url: Optional[str] = Field(
        default=None,
        description="Slack incoming webhook URL (pass empty string to clear)",
    )
    alerts_enabled: Optional[bool] = Field(
        default=None,
        description="Toggle notification delivery on or off",
    )


class NotificationTestRequest(BaseModel):
    """Payload to test deliverability of a webhook endpoint."""

    webhook_url: str = Field(
        ...,
        description="Live Discord or Slack webhook URL to test",
        examples=["https://discord.com/api/webhooks/123456789/abcdef"],
    )


class NotificationTestResponse(BaseModel):
    """Response returned upon successful webhook test dispatch."""

    status: str = Field(default="sent", description="Delivery status")
    message: str = Field(
        default="Live alert delivered to your channel!",
        description="Human-readable delivery result",
    )
