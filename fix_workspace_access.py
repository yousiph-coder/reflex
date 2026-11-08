import sys

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

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

        # Pre-index existing memberships in memory for fast lookup
        existing_members = {
            (m.user_id, m.organization_id): m
            for m in db.query(OrganizationMember).all()
        }

        for user in users:
            for org in orgs:
                membership = existing_members.get((user.id, org.id))

                if not membership:
                    new_member = OrganizationMember(
                        user_id=user.id,
                        organization_id=org.id,
                        role="owner",
                    )
                    db.add(new_member)
                    existing_members[(user.id, org.id)] = new_member
                    print(
                        f"[+] Assigned User '{user.email}' as OWNER to Workspace '{org.name}' ({org.id})"
                    )
                else:
                    if membership.role != "owner":
                        membership.role = "owner"
                    print(
                        f"[=] Updated User '{user.email}' to OWNER in Workspace '{org.name}'"
                    )

        db.commit()
        print("[✓] All workspace access permissions successfully synchronized!")
    except Exception as e:
        db.rollback()
        print(f"[!] Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    fix_access()
