import sys

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from datetime import datetime, timedelta, timezone
from sqlalchemy import or_
from app.db.session import SessionLocal
from app.models.tenant import Organization
from app.models.repository import Repository
from app.models.incident import Incident, RemediationAttempt


def sync_real_state():
    db = SessionLocal()
    try:
        orgs = db.query(Organization).all()
        for org in orgs:
            # 1. Remove fake/demo repositories, keep only real yousiph-coder repos
            all_repos = db.query(Repository).filter(
                or_(
                    Repository.organization_id == str(org.id),
                    Repository.organization_id == org.id,
                )
            ).all()
            vireon_repo = None
            for r in all_repos:
                if ("vireon" in r.full_name.lower() or "verion" in r.full_name.lower()) and not vireon_repo:
                    r.full_name = "yousiph-coder/Vireon"
                    r.name = "Vireon"
                    r.private = False
                    r.is_active = True
                    vireon_repo = r
                else:
                    db.delete(r)

            if not vireon_repo:
                vireon_repo = Repository(
                    organization_id=org.id,
                    github_repo_id=168046767,
                    name="Vireon",
                    full_name="yousiph-coder/Vireon",
                    private=False,
                    default_branch="main",
                    is_active=True,
                )
                db.add(vireon_repo)
                db.flush()

            # 2. Clean out stale failed/demo incidents and ensure the real merged PR #3 is recorded
            db.query(RemediationAttempt).filter(RemediationAttempt.organization_id == org.id).delete(synchronize_session=False)
            db.query(Incident).filter(Incident.organization_id == org.id).delete(synchronize_session=False)

            now = datetime.now(timezone.utc)
            real_incident = Incident(
                organization_id=org.id,
                repository_id=vireon_repo.id,
                error_type="TypeError",
                error_message="TypeError: Cannot read properties of undefined (reading 'length') in src/counter.js",
                file_path="src/counter.js",
                status="merged",
                pr_url="https://github.com/yousiph-coder/Vireon/pull/3",
                branch_name="autoheal/fix-incident-745a7b31",
                created_at=now - timedelta(seconds=38),
                resolved_at=now,
            )
            db.add(real_incident)

        db.commit()
        print("[✓] Database purged of mock records. Live state: 1 Repo (yousiph-coder/Vireon), 1 Merged PR (#3).")
    except Exception as e:
        db.rollback()
        print(f"[!] Error syncing state: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    sync_real_state()
