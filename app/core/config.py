"""
Core application configuration module.

Exposes the global ``settings`` singleton and direct Supabase configuration constants:
- ``SUPABASE_URL``
- ``SUPABASE_KEY``
- ``SUPABASE_SERVICE_ROLE_KEY``
"""

from __future__ import annotations

from app.config import Settings, get_settings

# Global application settings singleton
settings: Settings = get_settings()

# Direct Supabase configuration constants
SUPABASE_URL: str = settings.SUPABASE_URL
SUPABASE_KEY: str = settings.SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY: str = settings.SUPABASE_SERVICE_ROLE_KEY

# Direct Stripe & Frontend configuration constants
STRIPE_SECRET_KEY: str = settings.STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET: str = settings.STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID: str = settings.STRIPE_PRO_PRICE_ID
FRONTEND_URL: str = settings.FRONTEND_URL

__all__ = [
    "settings",
    "Settings",
    "get_settings",
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_PRICE_ID",
    "FRONTEND_URL",
]

