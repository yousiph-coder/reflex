"""
Database initialization and seeding script.

Applies schema migrations / creates all tables and seeds a default
tenant Organization with a valid API key for immediate development
and testing.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import generate_api_key, hash_api_key
from app.database import Base, close_db, get_engine, get_session_factory, init_db
from app.models.organization import APIKey, Organization, PlanTier

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("autoheal.init_db")


async def main() -> None:
    logger.info("Initializing database schema...")
    await init_db()
    engine = get_engine()

    async with engine.begin() as conn:
        logger.info("Creating tables from Base.metadata...")
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Tables successfully created/verified.")

    factory = get_session_factory()
    async with factory() as db:
        # Check if default org exists
        stmt = select(Organization).where(Organization.slug == "demo-org")
        res = await db.execute(stmt)
        org = res.scalar_one_or_none()

        if org is None:
            logger.info("Seeding default tenant: Demo Organization...")
            org = Organization(
                name="Demo Organization",
                slug="demo-org",
                plan_tier=PlanTier.PRO,
                is_active=True,
            )
            db.add(org)
            await db.flush()

            # Create seeded API key
            raw_key, prefix, hashed = generate_api_key(prefix="ah_live_")
            api_key = APIKey(
                organization_id=org.id,
                name="Default Admin Key",
                key_prefix=prefix,
                hashed_key=hashed,
                scopes=["incidents:read", "incidents:write", "webhooks:write", "analytics:read", "api_keys:read", "api_keys:write"],
                is_active=True,
            )
            db.add(api_key)
            await db.commit()

            logger.info("=" * 60)
            logger.info("SEEDING COMPLETE")
            logger.info("Organization ID : %s", org.id)
            logger.info("Organization Slug: %s", org.slug)
            logger.info("Plan Tier       : %s", org.plan_tier.value)
            logger.info("API Key (Plain) : %s", raw_key)
            logger.info("=" * 60)
            print(f"\n[SEEDED_API_KEY] {raw_key}\n")
        else:
            logger.info("Demo Organization already exists (ID: %s)", org.id)

    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
