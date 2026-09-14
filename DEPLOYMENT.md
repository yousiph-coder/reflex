# AutoHeal AI — Production Deployment & Distribution Guide

This document provides complete instructions for registering the **GitHub App**, provisioning cloud infrastructure on **Render** (FastAPI Backend, Incident Worker daemon, PostgreSQL, Redis), deploying the Next.js SaaS dashboard on **Vercel**, and configuring the automated CI/CD pipeline.

---

## 1. GitHub App Production Setup

AutoHeal AI integrates as an official GitHub App. This architecture enables:
- Short-lived, installation-scoped access tokens (1 hour TTL)
- Fine-grained repository permissions without granting blanket user-account access
- Webhook subscriptions to monitor PR lifecycles and installation changes

### Step 1.1: Register the GitHub App
1. Log in to GitHub and navigate to:
   - **Organization Settings** > **Developer settings** > **GitHub Apps** > **New GitHub App**  
   *(or Personal Settings > Developer settings > GitHub Apps for personal accounts)*
2. Fill in the core application settings:
   - **GitHub App name:** `AutoHeal AI` (or custom brand name)
   - **Homepage URL:** `https://autoheal.vercel.app` (or your domain)
   - **Callback URL:** `https://autoheal.vercel.app/api/auth/callback`
   - **Expire user authorization tokens:** Checked

### Step 1.2: Configure Webhook Delivery
- **Webhook URL:** `https://autoheal-api.onrender.com/api/v1/webhooks/github`
- **Webhook secret:** Generate a cryptographically strong 32-character secret:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
  *(Save this as `GITHUB_WEBHOOK_SECRET`)*
- **SSL verification:** Enabled

### Step 1.3: Repository Permissions Matrix
Grant the following permissions under **Repository permissions**:

| Resource | Access | Justification |
|---|---|---|
| **Contents** | **Read & write** | Required to fetch repo source files, blame history, and commit unified patch diffs. |
| **Pull requests** | **Read & write** | Required to open automated remediation PRs and track review/merge events. |
| **Issues** | **Read & write** | Required to reference Sentry crash issues, add diagnostic comments, and link PRs. |
| **Metadata** | **Read-only** | Mandatory default (read repository metadata and branches). |

> [!NOTE]
> No Account permissions or Organization permissions are required. Keep permissions strictly minimal.

### Step 1.4: Subscribe to Webhook Events
Under **Subscribe to events**, select:
- [x] **Installation** (`created`, `deleted`, `suspend`, `unsuspend`)
- [x] **Installation target** (`renamed`)
- [x] **Pull request** (`opened`, `closed`, `reopened`)

### Step 1.5: Generate Private Key
1. In the newly created GitHub App settings, scroll to the bottom to **Private keys**.
2. Click **Generate a private key**.
3. A `.pem` file will download to your computer.
4. Keep this file secure! Its content is used for `GITHUB_PRIVATE_KEY`.

---

## 2. Infrastructure as Code Deployment on Render

AutoHeal AI includes a declarative Blueprint specification (`render.yaml`) that spins up all backend cloud resources with zero manual dashboard clicking.

### Services Provisioned:
1. **`autoheal-postgres`**: Managed PostgreSQL database for multi-tenant organizations, API keys, incidents, and remediation attempts.
2. **`autoheal-redis`**: Managed Redis instance for incident deduplication (atomic `SET NX`) and rate limiting.
3. **`autoheal-api`**: FastAPI web service running Uvicorn with 4 worker processes and health probes.
4. **`autoheal-worker`**: Continuous background worker daemon polling and remediating pending crashes.

### Step 2.1: Deploy via Render Blueprint
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository containing the AutoHeal AI codebase.
4. Render automatically parses `render.yaml` and lists the four resources to be created.
5. Provide the un-synced environment variables when prompted:

| Environment Variable | Value / Description |
|---|---|
| `GITHUB_APP_ID` | Numeric App ID found in your GitHub App general settings (e.g. `1048293`). |
| `GITHUB_PRIVATE_KEY` | Paste the entire PEM file contents (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`). |
| `GITHUB_WEBHOOK_SECRET` | Secret token generated in Step 1.2. |
| `SENTRY_CLIENT_SECRET` | Client Secret from your Sentry Internal Integration for webhook signature validation. |
| `LLM_API_KEY` | OpenAI or Azure/Groq API key for reasoning engine (`gpt-4o`). |
| `SLACK_WEBHOOK_URL` | *(Optional)* Slack Incoming Webhook for real-time alerts. |
| `DISCORD_WEBHOOK_URL` | *(Optional)* Discord Webhook URL for real-time alerts. |

6. Click **Apply**. Render will provision PostgreSQL, Redis, and build/deploy both the API and Worker containers.

---

## 3. Frontend Deployment on Vercel

The Next.js 15 SaaS Dashboard is optimized for immediate zero-config deployment to Vercel.

### Step 3.1: Connect Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
2. Select your AutoHeal repository.
3. If deploying from the repository root, set **Root Directory** to `frontend`.
4. Framework Preset: **Next.js**.

### Step 3.2: Environment Variables
Add the following variable in the Vercel project settings:
```ini
NEXT_PUBLIC_API_URL=https://autoheal-api.onrender.com/api/v1
```

### Step 3.3: Deploy
Click **Deploy**. Vercel will run `next build` and generate your static and dynamic SSR routes. `vercel.json` provides built-in reverse proxy rewrite rules to forward `/api/v1/*` to your Render API.

---

## 4. Continuous Integration & Verification (CI/CD)

The repository is protected by `.github/workflows/deploy.yml` which triggers automatically on every pull request and push to `main`:

1. **`backend-test`**:
   - Boots ephemeral containerized PostgreSQL 16 and Redis 7 service containers in GitHub Actions.
   - Installs Python 3.12 dependencies.
   - Runs full unit and integration test suite (`pytest tests/ -v`).
2. **`frontend-build`**:
   - Runs Node.js 20 environment with `npm ci`.
   - Runs Next.js strict type-checking and production compilation (`npm run build`).

---

## 5. End-to-End Testing & Verification

### Test 1: Health & Liveness Probe
```bash
curl -i https://autoheal-api.onrender.com/health
# Expected: HTTP 200 OK {"status":"healthy","service":"auto-heal-ai","environment":"production"}
```

### Test 2: GitHub Webhook Ping
```bash
WEBHOOK_SECRET="your_secret_here"
BODY='{"zen":"Practicality beats purity.","hook_id":1}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print "sha256="$2}')

curl -i -X POST https://autoheal-api.onrender.com/api/v1/webhooks/github \
  -H "Content-Type: application/json" \
  -H "x-github-event: ping" \
  -H "x-hub-signature-256: $SIGNATURE" \
  -d "$BODY"
# Expected: HTTP 200 OK {"status":"pong","zen":"Practicality beats purity.","hook_id":1}
```

### Test 3: Sentry Crash Simulation & Closed-Loop Remediation
```bash
python scripts/simulate_and_remediate.py
# Simulates crash against target repo, verifies in sandbox, opens PR #1, and dispatches Slack/Discord notifications.
```
