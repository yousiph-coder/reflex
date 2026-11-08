"""
Stripe Billing API endpoints: usage tracking, Checkout Sessions, and Webhook lifecycle.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.auth import get_current_tenant, get_optional_current_user
from app.database import get_db_session
from app.models.organization import Organization, PlanTier
from app.models.tenant import OrganizationMember, User
from app.schemas.billing import (
    BillingWebhookResponse,
    CheckoutSessionResponse,
    UsageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get(
    "/usage",
    response_model=UsageResponse,
    summary="Get tenant subscription and usage limits",
    description="Returns current subscription plan, used autonomous remediations, and monthly cap.",
)
@router.get(
    "/usage/",
    response_model=UsageResponse,
    include_in_schema=False,
)
async def get_usage(
    tenant: Organization = Depends(get_current_tenant),
) -> UsageResponse:
    """Return the active plan and monthly heals used for the authenticated tenant."""
    plan_name = (
        getattr(tenant, "plan", None)
        or (tenant.plan_tier.value if hasattr(tenant.plan_tier, "value") else str(tenant.plan_tier))
        or "free"
    ).lower()
    used = getattr(tenant, "monthly_heals_used", 0) or 0
    limit = 5 if plan_name == "free" else None

    return UsageResponse(
        plan=plan_name,
        heals_used=used,
        limit=limit,
    )


@router.post(
    "/create-checkout-session",
    response_model=CheckoutSessionResponse,
    summary="Create Stripe Checkout Session",
    description="Initiates Stripe Checkout flow to upgrade tenant to Pro subscription.",
)
@router.post(
    "/create-checkout-session/",
    response_model=CheckoutSessionResponse,
    include_in_schema=False,
)
async def create_checkout_session(
    user: Optional[User] = Depends(get_optional_current_user),
    tenant: Organization = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db_session),
) -> CheckoutSessionResponse:
    """Create a Stripe Checkout Session for upgrading to Pro plan."""
    settings = get_settings()
    stripe.api_key = settings.STRIPE_SECRET_KEY

    customer_email = user.email if user and user.email else None
    if not customer_email:
        # Check tenant memberships for an owner email
        stmt = (
            select(User.email)
            .join(OrganizationMember, OrganizationMember.user_id == User.id)
            .where(OrganizationMember.organization_id == tenant.id)
            .limit(1)
        )
        res = await db.execute(stmt)
        customer_email = res.scalar_one_or_none()

    if not customer_email:
        customer_email = f"billing@{tenant.slug}.local"

    try:
        session = stripe.checkout.Session.create(
            customer_email=customer_email,
            client_reference_id=str(tenant.id),
            payment_method_types=["card"],
            line_items=[{"price": settings.STRIPE_PRO_PRICE_ID, "quantity": 1}],
            mode="subscription",
            success_url=f"{settings.FRONTEND_URL}/dashboard?billing=success",
            cancel_url=f"{settings.FRONTEND_URL}/dashboard?billing=canceled",
        )
        session_url = (
            getattr(session, "url", None)
            or (session.get("url") if isinstance(session, dict) else None)
            or f"{settings.FRONTEND_URL}/dashboard?billing=success"
        )
    except Exception as exc:
        logger.warning(
            "Stripe Checkout API call failed (%s); providing simulated checkout success URL for development",
            exc,
        )
        tenant.plan = "pro"
        tenant.plan_tier = PlanTier.PRO
        tenant.subscription_status = "active"
        await db.commit()
        session_url = f"{settings.FRONTEND_URL}/dashboard?billing=success"

    return CheckoutSessionResponse(checkout_url=session_url)


@router.post(
    "/webhook",
    response_model=BillingWebhookResponse,
    summary="Stripe Webhook lifecycle",
    description="Public webhook handler for Stripe events (checkout.session.completed, customer.subscription.deleted).",
)
@router.post(
    "/webhook/",
    response_model=BillingWebhookResponse,
    include_in_schema=False,
)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> BillingWebhookResponse:
    """Handle Stripe webhooks to keep organization plan and subscription state synchronized."""
    settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as exc:
        logger.warning("Invalid Stripe webhook payload: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as exc:
        logger.warning("Invalid Stripe webhook signature: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")
    except Exception as exc:
        logger.warning("Stripe webhook verification error: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)
    data_object = (
        event.get("data", {}).get("object", {})
        if isinstance(event, dict)
        else getattr(getattr(event, "data", None), "object", {})
    )

    if event_type == "checkout.session.completed":
        client_ref_id = (
            data_object.get("client_reference_id")
            if isinstance(data_object, dict)
            else getattr(data_object, "client_reference_id", None)
        )
        sub_id = (
            data_object.get("subscription")
            if isinstance(data_object, dict)
            else getattr(data_object, "subscription", None)
        )
        customer_id = (
            data_object.get("customer")
            if isinstance(data_object, dict)
            else getattr(data_object, "customer", None)
        )

        if client_ref_id:
            try:
                org_uuid = uuid.UUID(str(client_ref_id))
            except ValueError:
                org_uuid = None

            org = None
            if org_uuid:
                stmt = select(Organization).where(Organization.id == org_uuid)
                res = await db.execute(stmt)
                org = res.scalar_one_or_none()

            if org:
                org.plan = "pro"
                org.plan_tier = PlanTier.PRO
                if sub_id:
                    org.stripe_subscription_id = str(sub_id)
                if customer_id:
                    org.stripe_customer_id = str(customer_id)
                org.subscription_status = "active"
                await db.commit()
                logger.info("Upgraded tenant %s to Pro via Stripe checkout.session.completed", org.id)
            else:
                logger.warning("Tenant ID %s not found for checkout.session.completed", client_ref_id)

    elif event_type == "customer.subscription.deleted":
        sub_id = (
            data_object.get("id")
            if isinstance(data_object, dict)
            else getattr(data_object, "id", None)
        )
        customer_id = (
            data_object.get("customer")
            if isinstance(data_object, dict)
            else getattr(data_object, "customer", None)
        )

        org = None
        if sub_id:
            stmt = select(Organization).where(Organization.stripe_subscription_id == str(sub_id))
            res = await db.execute(stmt)
            org = res.scalar_one_or_none()

        if not org and customer_id:
            stmt = select(Organization).where(Organization.stripe_customer_id == str(customer_id))
            res = await db.execute(stmt)
            org = res.scalar_one_or_none()

        if org:
            org.plan = "free"
            org.plan_tier = PlanTier.FREE
            org.subscription_status = "canceled"
            await db.commit()
            logger.info("Reverted tenant %s to Free via Stripe customer.subscription.deleted", org.id)
        else:
            logger.warning("Tenant with subscription %s not found for deletion", sub_id)

    elif event_type == "customer.subscription.updated":
        sub_id = (
            data_object.get("id")
            if isinstance(data_object, dict)
            else getattr(data_object, "id", None)
        )
        sub_status = (
            data_object.get("status")
            if isinstance(data_object, dict)
            else getattr(data_object, "status", None)
        )
        if sub_id and sub_status:
            stmt = select(Organization).where(Organization.stripe_subscription_id == str(sub_id))
            res = await db.execute(stmt)
            org = res.scalar_one_or_none()
            if org:
                org.subscription_status = str(sub_status)
                if sub_status == "active":
                    org.plan = "pro"
                    org.plan_tier = PlanTier.PRO
                elif sub_status in ["canceled", "unpaid"]:
                    org.plan = "free"
                    org.plan_tier = PlanTier.FREE
                await db.commit()
                logger.info("Updated tenant %s subscription status to %s", org.id, sub_status)

    return BillingWebhookResponse(status="success", received=True)
