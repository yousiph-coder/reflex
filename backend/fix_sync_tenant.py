import asyncio
from app.db.session import SessionLocal
from app.models.tenant import Organization
from app.services.github_app import get_installation_repositories
from app.models.repository import Repository


def fix_tenant():
    db = SessionLocal()
    try:
        # Find active organization (Dev Sandbox or primary tenant)
        org = db.query(Organization).first()
        if not org:
            print("No organization found!")
            return

        org.github_installation_id = 168046767
        db.commit()
        print(f"Updated Organization {org.name} ({org.id}) with installation_id 168046767")

        # Fetch repos for this installation
        repos = get_installation_repositories(168046767)
        if asyncio.iscoroutine(repos):
            try:
                repos = asyncio.run(repos)
            except Exception as exc:
                print(f"GitHub API Error during fetch: {exc}")
                repos = []

        print(f"Retrieved {len(repos)} repositories from GitHub App: {[r.get('full_name') for r in repos]}")

        for r in repos:
            repo_record = db.query(Repository).filter(Repository.github_repo_id == r['id']).first()
            if not repo_record:
                repo_record = Repository(
                    organization_id=org.id,
                    github_repo_id=r['id'],
                    name=r['name'],
                    full_name=r['full_name'],
                    private=r.get('private', False),
                    default_branch=r.get('default_branch', 'main'),
                    is_active=True
                )
                db.add(repo_record)
        db.commit()
        print("Repositories successfully saved to Database!")
    finally:
        db.close()


if __name__ == "__main__":
    fix_tenant()
