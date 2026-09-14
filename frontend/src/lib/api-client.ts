import {
  AnalyticsMetrics,
  APIKeyCreated,
  APIKeyItem,
  IncidentDetail,
  IncidentListResponse,
  IncidentSummary,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "ah_live_default_admin_key_test_12345";

// ── Realistic Mock Fallbacks for Standalone Mode ────────────────
const MOCK_METRICS: AnalyticsMetrics = {
  total_incidents: 148,
  resolved_incidents: 139,
  failed_incidents: 6,
  pending_incidents: 2,
  remediating_incidents: 1,
  autoheal_success_rate_pct: 95.86,
  avg_mttr_seconds: 38.4,
  total_remediation_attempts: 162,
  successful_remediation_attempts: 139,
  sandbox_pass_rate_pct: 85.8,
  total_tokens_consumed: 412500,
  estimated_cost_usd: 1.856,
  top_failing_files: [
    { name: "app/services/auth.py", count: 42 },
    { name: "app/core/deduplicator.py", count: 28 },
    { name: "app/api/v1/orders.py", count: 21 },
    { name: "app/models/session.py", count: 17 },
    { name: "app/services/billing.py", count: 11 },
  ],
  top_error_types: [
    { name: "KeyError", count: 48 },
    { name: "AttributeError", count: 34 },
    { name: "ValueError", count: 26 },
    { name: "TypeError", count: 22 },
    { name: "DatabaseConnectionError", count: 18 },
  ],
};

const MOCK_INCIDENTS: IncidentSummary[] = [
  {
    id: "7f9a2b1c-8e3d-4f2a-9b1c-0e2d3f4a5b6c",
    organization_id: "org-101",
    sentry_issue_id: "ISSUE-AUTH-KEYERROR-101",
    title: "KeyError: 'user_id' in get_current_user",
    error_type: "KeyError",
    error_message: "'user_id'",
    file_path: "app/services/auth.py",
    function_name: "get_current_user",
    line_number: 14,
    project_slug: "autoheal-target-demo",
    environment: "production",
    platform: "python",
    level: "error",
    status: "RESOLVED",
    retry_count: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
  },
  {
    id: "2c8d4e6f-1a3b-5c7d-9e0f-2a4b6c8d0e1f",
    organization_id: "org-101",
    sentry_issue_id: "ISSUE-ORDER-DISCOUNT-204",
    title: "TypeError: unsupported operand type(s) for -: 'float' and 'NoneType'",
    error_type: "TypeError",
    error_message: "unsupported operand type(s) for -: 'float' and 'NoneType'",
    file_path: "app/api/v1/orders.py",
    function_name: "calculate_cart_total",
    line_number: 88,
    project_slug: "autoheal-target-demo",
    environment: "production",
    platform: "python",
    level: "error",
    status: "RESOLVED",
    retry_count: 1,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
  },
  {
    id: "9e1f3a5b-7c9d-1e3f-5a7b-9c1d3e5f7a9b",
    organization_id: "org-101",
    sentry_issue_id: "ISSUE-TOKEN-EXPIRED-308",
    title: "ValueError: Invalid or expired refresh token",
    error_type: "ValueError",
    error_message: "Invalid or expired refresh token",
    file_path: "app/models/session.py",
    function_name: "refresh_session_token",
    line_number: 142,
    project_slug: "autoheal-target-demo",
    environment: "staging",
    platform: "python",
    level: "error",
    status: "REMEDIATING",
    retry_count: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
  },
  {
    id: "4a6b8c0d-2e4f-6a8b-0c2d-4e6f8a0b2c4d",
    organization_id: "org-101",
    sentry_issue_id: "ISSUE-REDIS-TIMEOUT-412",
    title: "ConnectionTimeout: Timeout while connecting to Redis host",
    error_type: "ConnectionTimeout",
    error_message: "Timeout while connecting to Redis host at redis:6379",
    file_path: "app/core/deduplicator.py",
    function_name: "acquire_lock",
    line_number: 55,
    project_slug: "autoheal-target-demo",
    environment: "production",
    platform: "python",
    level: "fatal",
    status: "FAILED",
    retry_count: 2,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 174).toISOString(),
  },
  {
    id: "1b3d5f7a-9c1e-3f5a-7b9d-1c3e5a7b9d1e",
    organization_id: "org-101",
    sentry_issue_id: "ISSUE-BILLING-CURRENCY-505",
    title: "KeyError: 'currency_code' in format_invoice",
    error_type: "KeyError",
    error_message: "'currency_code'",
    file_path: "app/services/billing.py",
    function_name: "format_invoice",
    line_number: 210,
    project_slug: "autoheal-target-demo",
    environment: "production",
    platform: "python",
    level: "error",
    status: "PENDING",
    retry_count: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
];

const MOCK_API_KEYS: APIKeyItem[] = [
  {
    id: "key-1",
    name: "Production Ingestion Key",
    key_prefix: "ah_live_8f3c9a1d",
    scopes: ["incidents:read", "incidents:write", "webhooks:write", "analytics:read"],
    is_active: true,
    last_used_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    expires_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: "key-2",
    name: "Sentry Integration Webhook",
    key_prefix: "ah_live_2e7b4a90",
    scopes: ["webhooks:write"],
    is_active: true,
    last_used_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    expires_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: "key-3",
    name: "CI/CD Test Runner",
    key_prefix: "ah_live_9c0e1f3a",
    scopes: ["incidents:read"],
    is_active: false,
    last_used_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    expires_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
];

// ── Generic Fetch Wrapper ──────────────────────────────────────
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[AutoHeal API Client] Falling back to mock data for ${endpoint}:`, error);
    throw error;
  }
}

// ── Exported API Client Methods ────────────────────────────────
export const apiClient = {
  async getMetrics(startDate?: string, endDate?: string): Promise<AnalyticsMetrics> {
    const query = new URLSearchParams();
    if (startDate) query.append("start_date", startDate);
    if (endDate) query.append("end_date", endDate);
    const qs = query.toString() ? `?${query.toString()}` : "";

    try {
      return await fetchWithAuth<AnalyticsMetrics>(`/analytics/metrics${qs}`);
    } catch {
      return MOCK_METRICS;
    }
  },

  async getIncidents(params: {
    status?: string;
    repository?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<IncidentListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.repository) query.append("repository", params.repository);
    if (params.page) query.append("page", params.page.toString());
    if (params.pageSize) query.append("page_size", params.pageSize.toString());
    const qs = query.toString() ? `?${query.toString()}` : "";

    try {
      return await fetchWithAuth<IncidentListResponse>(`/incidents${qs}`);
    } catch {
      let filtered = [...MOCK_INCIDENTS];
      if (params.status) {
        filtered = filtered.filter((i) => i.status === params.status);
      }
      if (params.repository) {
        filtered = filtered.filter((i) =>
          i.file_path?.toLowerCase().includes(params.repository!.toLowerCase())
        );
      }
      return {
        items: filtered,
        total: filtered.length,
        page: params.page || 1,
        page_size: params.pageSize || 20,
        total_pages: 1,
      };
    }
  },

  async getIncident(id: string): Promise<IncidentDetail> {
    try {
      return await fetchWithAuth<IncidentDetail>(`/incidents/${id}`);
    } catch {
      const summary = MOCK_INCIDENTS.find((i) => i.id === id) || MOCK_INCIDENTS[0];
      return {
        ...summary,
        stack_trace: `Traceback (most recent call last):
  File "A:\\auto heal ai\\scripts\\simulate_and_remediate.py", line 72, in simulate_incident
    get_current_user({})
  File "A:\\autoheal-target-demo\\app\\services\\auth.py", line 14, in get_current_user
    user_id = session_data['user_id']
              ~~~~~~~~~~~~^^^^^^^^^^^
KeyError: 'user_id'`,
        raw_event: {
          sentry_id: summary.sentry_issue_id,
          handled: false,
          platform: "python",
        },
        remediation_attempts: [
          {
            id: "att-1",
            incident_id: summary.id,
            strategy: "automated_fix",
            analysis: `### Root Cause Analysis (RCA)
The \`get_current_user\` function directly accessed the \`'user_id'\` key on the incoming \`session_data\` dictionary without checking key existence or validating dictionary type. When passed an empty session \`{}\`, an unhandled \`KeyError\` crashed the request handler.

### Proposed Solution
1. Validate \`session_data\` is a valid dictionary instance.
2. Use safe dictionary lookup \`.get('user_id')\`.
3. Raise an informative \`KeyError\` if \`user_id\` is missing or empty.`,
            diff: `--- a/app/services/auth.py
+++ b/app/services/auth.py
@@ -10,9 +10,13 @@ def get_current_user(session_data: Dict[str, Any]) -> str:
-    user_id = session_data['user_id']
-    return user_id
+    if not isinstance(session_data, dict):
+        raise TypeError("session_data must be a dictionary")
+    user_id = session_data.get('user_id')
+    if not user_id:
+        raise KeyError("Malformed session context: 'user_id' is missing or empty")
+    return str(user_id)`,
            pr_url: "https://github.com/yousiph-coder/autoheal-target-demo/pull/1",
            pr_number: 1,
            branch_name: "autoheal/fix-auth-keyerror-1789351939",
            status: "PR_OPENED",
            llm_model: "gpt-4o",
            llm_provider: "openai",
            prompt_tokens: 1420,
            completion_tokens: 410,
            total_tokens: 1830,
            cost_usd: 0.0084,
            duration_seconds: 0.31,
            error_message: null,
            created_at: summary.updated_at,
          },
        ],
      };
    }
  },

  async getApiKeys(): Promise<APIKeyItem[]> {
    try {
      return await fetchWithAuth<APIKeyItem[]>("/organizations/api-keys");
    } catch {
      return MOCK_API_KEYS;
    }
  },

  async createApiKey(payload: { name: string; scopes?: string[]; expires_in_days?: number }): Promise<APIKeyCreated> {
    try {
      return await fetchWithAuth<APIKeyCreated>("/organizations/api-keys", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      const id = `key-${Date.now()}`;
      const prefix = `ah_live_${Math.random().toString(36).substring(2, 10)}`;
      const raw = `${prefix}_${Math.random().toString(36).substring(2, 18)}${Math.random().toString(36).substring(2, 18)}`;
      const newKey: APIKeyCreated = {
        id,
        name: payload.name,
        key_prefix: prefix,
        scopes: payload.scopes || ["incidents:read", "incidents:write", "webhooks:write", "analytics:read"],
        is_active: true,
        last_used_at: null,
        expires_at: payload.expires_in_days ? new Date(Date.now() + payload.expires_in_days * 86400000).toISOString() : null,
        created_at: new Date().toISOString(),
        raw_key: raw,
      };
      MOCK_API_KEYS.unshift(newKey);
      return newKey;
    }
  },
};
