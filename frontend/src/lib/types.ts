export type IncidentStatus =
  | "PENDING"
  | "ANALYZING"
  | "REMEDIATING"
  | "RESOLVED"
  | "FAILED"
  | "IGNORED";

export type RemediationStatus =
  | "IN_PROGRESS"
  | "PR_OPENED"
  | "PR_MERGED"
  | "FAILED"
  | "ROLLED_BACK";

export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export interface IncidentSummary {
  id: string;
  organization_id: string;
  sentry_issue_id: string;
  title: string;
  error_type: string;
  error_message: string | null;
  file_path: string | null;
  function_name: string | null;
  line_number: number | null;
  project_slug: string | null;
  environment: string | null;
  platform: string | null;
  level: string;
  status: IncidentStatus;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface RemediationAttempt {
  id: string;
  incident_id: string;
  strategy: string;
  analysis: string | null;
  diff: string | null;
  pr_url: string | null;
  pr_number: number | null;
  branch_name: string | null;
  status: RemediationStatus;
  llm_model: string;
  llm_provider: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

export interface IncidentDetail extends IncidentSummary {
  stack_trace: string | null;
  raw_event: Record<string, any> | null;
  remediation_attempts: RemediationAttempt[];
}

export interface IncidentListResponse {
  items: IncidentSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MetricItem {
  name: string;
  count: number;
}

export interface AnalyticsMetrics {
  total_incidents: number;
  resolved_incidents: number;
  failed_incidents: number;
  pending_incidents: number;
  remediating_incidents: number;
  autoheal_success_rate_pct: number;
  avg_mttr_seconds: number | null;
  total_remediation_attempts: number;
  successful_remediation_attempts: number;
  sandbox_pass_rate_pct: number;
  total_tokens_consumed: number;
  estimated_cost_usd: number;
  top_failing_files: MetricItem[];
  top_error_types: MetricItem[];
}

export interface APIKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface APIKeyCreated extends APIKeyItem {
  raw_key: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: PlanTier;
  is_active: boolean;
  created_at: string;
}
