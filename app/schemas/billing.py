"""
Pydantic schemas for Stripe billing, subscription usage, and webhook responses.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class UsageResponse(BaseModel):
    """Current subscription plan and remediation usage limits."""

    plan: str = Field(description="Active subscription plan ('free', 'pro', 'enterprise')")
    heals_used: int = Field(description="Number of autonomous heals/remediations used in the current billing cycle")
    limit: Optional[int] = Field(default=None, description="Max heals allowed per month (5 for free tier, None for unlimited)")


class CheckoutSessionResponse(BaseModel):
    """Stripe Checkout Session redirection URL response."""

    checkout_url: str = Field(description="URL to redirect user for Stripe Checkout")


class BillingWebhookResponse(BaseModel):
    """Stripe webhook processing acknowledgment."""

    status: str = Field(default="success")
    received: bool = Field(default=True)
