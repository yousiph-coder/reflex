import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.tenant import Organization, OrganizationMember
from app.models.user import User

def fix_access():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        orgs = db.query(Organization).all()

        if not users:
            print("[-] No users found in database.")
            return

        if not orgs:
            print("[-] No organizations found in database.")
            return

        print(f"[*] Found {len(users)} user(s) and {len(orgs)} organization(s).")

        for user in users:
            for org in orgs:
                membership = db.query(OrganizationMember).filter(
                    OrganizationMember.user_id == user.id,
                    OrganizationMember.organization_id == org.id
                ).first()

                if not membership:
                    new_member = OrganizationMember(
                        user_id=user.id,
                        organization_id=org.id,
                        role="owner"
                    )
                    db.add(new_member)
                    print(f"[+] Assigned User '{user.email}' as OWNER to Workspace '{org.name}' ({org.id})")
                else:
                    membership.role = "owner"
                    print(f"[=] Updated User '{user.email}' to OWNER in Workspace '{org.name}'")

        db.commit()
        print("[✓] All workspace access permissions successfully synchronized!")
    except Exception as e:
        db.rollback()
        print(f"[!] Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_access()
