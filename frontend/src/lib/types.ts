export type IncidentStatus =
  | "PENDING"
  | "ANALYZING"
  | "REMEDIATING"
  | "AWAITING_APPROVAL"
  | "REJECTED"
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

export interface ReasoningStep {
  step: number;
  title: string;
  description: string;
}

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
  pr_url?: string | null;
  branch_name?: string | null;
  resolved_at?: string | null;
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
  repository_full_name?: string | null;
  pr_number?: number | null;
  confidence_score?: number;
  severity_vitality?: number;
  original_code?: string | null;
  patched_code?: string | null;
  reasoning_steps?: ReasoningStep[];
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

export interface RepositoryAnalytics {
  total: number;
  private: number;
  public: number;
  autopilot: number;
  autopilot_pct: number;
}

export interface IncidentAnalytics {
  total: number;
  healed_prs: number;
  remediating: number;
  failed: number;
  pending: number;
  success_rate: number;
  mttr_seconds: number | null;
}

export interface RoiAnalytics {
  healed_prs: number;
  hours_saved: number;
  cost_saved_usd: number;
  hourly_rate_assumed: number;
  hours_per_incident: number;
  pro_plan_cost: number;
  roi_multiplier: number;
}

export interface AnalyticsOverview {
  repositories: RepositoryAnalytics;
  incidents: IncidentAnalytics;
  roi: RoiAnalytics;
  vitality_score: number;
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

export type RemediationMode = "autonomous" | "draft_pr" | "manual_approval" | "disabled";

export type RepositoryStatus = "connected" | "sync_error" | "syncing" | "unreachable";

export interface SentryProjectMapping {
  id: string;
  organization_slug: string;
  project_slug: string;
  environment: string;
  path_prefix?: string;
  is_active: boolean;
  last_event_at?: string | null;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  default_branch: string;
  language: string;
  visibility: "public" | "private";
  status: RepositoryStatus;
  remediation_mode: RemediationMode;
  auto_heal_enabled: boolean;
  sandbox_test_cmd: string;
  llm_model: string;
  root_directory?: string;
  sentry_mappings: SentryProjectMapping[];
  total_prs_opened: number;
  total_incidents_resolved: number;
  healed_prs_count?: number;
  open_incidents_count?: number;
  last_synced_at: string;
  created_at: string;
  webhook_active: boolean;
  webhook_url?: string;
  stars_count?: number;
  forks_count?: number;
  description?: string;
}

export interface CreateRepoPayload {
  owner: string;
  name: string;
  default_branch: string;
  language: string;
  visibility: "public" | "private";
  remediation_mode: RemediationMode;
  sandbox_test_cmd: string;
  llm_model: string;
  root_directory?: string;
  sentry_organization_slug: string;
  sentry_project_slug: string;
  sentry_environment: string;
  description?: string;
}

export interface UpdateRepoPayload {
  remediation_mode?: RemediationMode;
  auto_heal_enabled?: boolean;
  default_branch?: string;
  sandbox_test_cmd?: string;
  llm_model?: string;
  root_directory?: string;
  sentry_mappings?: SentryProjectMapping[];
  description?: string;
}

export interface RepoSyncResult {
  success: boolean;
  message: string;
  synced_at: string;
  branch_head: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug?: string;
  plan: PlanTier;
  role?: "owner" | "admin" | "member";
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

export interface BillingUsage {
  plan: PlanTier | string;
  heals_used: number;
  limit: number | null;
}

export interface CheckoutSessionResult {
  checkout_url: string;
}

export interface NotificationSettings {
  discord_webhook_url: string | null;
  slack_webhook_url: string | null;
  alerts_enabled: boolean;
}

export interface NotificationTestResult {
  status: string;
  message: string;
}


