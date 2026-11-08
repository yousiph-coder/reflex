"""
One-time fix script: Links the first user in the DB to the first available
Production (or fallback) org as OWNER, if membership is missing.

Usage:
    python link_user_workspace.py
"""

from app.db.session import SessionLocal
# All three models live in app.models.tenant (no separate app.models.user module)
from app.models.tenant import Organization, OrganizationMember, User


def fix_membership():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        org = (
            db.query(Organization).filter(Organization.name.ilike("%Production%")).first()
            or db.query(Organization).first()
        )

        if not user or not org:
            print("ERROR: User or Org missing in DB.")
            return

        print(f"Found User  : {user.email} ({user.id})")
        print(f"Found Org   : {org.name} ({org.id})")

        # Check existing membership
        member = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.user_id == user.id,
                OrganizationMember.organization_id == org.id,
            )
            .first()
        )

        if not member:
            member = OrganizationMember(
                user_id=user.id,
                organization_id=org.id,
                role="owner",
            )
            db.add(member)
            db.commit()
            print(
                f"[OK] Successfully linked User {user.email} to Workspace "
                f"'{org.name}' as OWNER!"
            )
        else:
            print(
                f"[INFO] User {user.email} is already linked to '{org.name}' "
                f"(role={member.role})."
            )
    finally:
        db.close()


if __name__ == "__main__":
    fix_membership()
