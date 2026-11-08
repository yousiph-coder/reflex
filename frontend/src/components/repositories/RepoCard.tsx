"use client";

import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Cpu,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  Globe,
  Lock,
  Radio,
  RefreshCw,
  Settings2,
  Terminal,
  Trash2,
} from "lucide-react";
import { RemediationMode, Repository } from "@/lib/types";
import {
  cn,
  formatRelativeTime,
  getLanguageColor,
} from "@/lib/utils";

interface RepoCardProps {
  repo: Repository;
  onUpdateMode: (id: string, mode: RemediationMode) => Promise<void>;
  onToggleAutoHeal: (id: string, enabled: boolean) => Promise<void>;
  onSync: (id: string) => Promise<void>;
  onEdit: (repo: Repository) => void;
  onDelete: (repo: Repository) => void;
  onOpenWebhookGuide: (repo: Repository) => void;
}

export function RepoCard({
  repo,
  onUpdateMode,
  onToggleAutoHeal,
  onSync,
  onEdit,
  onDelete,
  onOpenWebhookGuide,
}: RepoCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isChangingMode, setIsChangingMode] = useState(false);

  const langColor = getLanguageColor(repo.language);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await onSync(repo.id);
      setSyncFeedback("Synced");
      setTimeout(() => setSyncFeedback(null), 2500);
    } catch {
      setSyncFeedback("Failed");
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleModeChange = async (newMode: RemediationMode) => {
    if (newMode === repo.remediation_mode) return;
    setIsChangingMode(true);
    try {
      await onUpdateMode(repo.id, newMode);
    } finally {
      setIsChangingMode(false);
    }
  };

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    await onToggleAutoHeal(repo.id, nextVal);
  };

  return (
    <div className="rounded-2xl liquid-glass p-5 sm:p-6 transition-all hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-300 space-y-5 relative select-none">
      {/* ── Top Bar: GitHub Info & Sync Status ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Repo Title & GitHub Link */}
            <a
              href={`https://github.com/${repo.full_name}`}
              target="_blank"
              rel="noreferrer"
              className="text-base font-semibold text-white dark:text-white light:text-zinc-950 hover:text-emerald-400 dark:hover:text-emerald-400 light:hover:text-emerald-600 transition-colors flex items-center gap-1.5 group truncate font-mono"
              title={`View ${repo.full_name} on GitHub`}
            >
              <FolderGit2 className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 flex-shrink-0" />
              <span className="truncate">{repo.full_name}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>

            {/* Visibility Badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border",
                repo.visibility === "private"
                  ? "bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 text-zinc-300 dark:text-zinc-300 light:text-zinc-700 border-white/10 dark:border-white/10 light:border-zinc-200"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}
            >
              {repo.visibility === "private" ? (
                <Lock className="w-3 h-3 text-zinc-400" />
              ) : (
                <Globe className="w-3 h-3 text-blue-400" />
              )}
              {repo.visibility === "private" ? "Private" : "Public"}
            </span>

            {/* Language Badge */}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-[11px] font-mono text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: langColor }}
              />
              {repo.language}
            </span>

            {/* Default Branch */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-[11px] font-mono text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
              <GitBranch className="w-3 h-3 text-zinc-500" />
              {repo.default_branch}
            </span>

            {/* Root Directory Pill (if monorepo) */}
            {repo.root_directory && repo.root_directory !== "/" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-[11px] font-mono text-amber-400">
                root: {repo.root_directory}
              </span>
            )}
          </div>

          {repo.description && (
            <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 line-clamp-1 font-sans leading-relaxed">
              {repo.description}
            </p>
          )}
        </div>

        {/* Sync & Action Buttons */}
        <div className="flex items-center gap-2 self-start flex-shrink-0">
          <button
            type="button"
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-zinc-200 border border-white/10 dark:border-white/10 light:border-zinc-300 text-xs font-mono font-medium text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors disabled:opacity-50"
            title="Fetch latest git commits and test webhook connectivity"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5 transition-transform",
                isSyncing ? "animate-spin text-emerald-400" : "text-zinc-400"
              )}
            />
            <span>
              {isSyncing ? "Syncing..." : syncFeedback ? syncFeedback : "Sync Branch"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(repo)}
            className="p-1.5 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-zinc-200 border border-white/10 dark:border-white/10 light:border-zinc-300 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors"
            title="Edit Repository & Sentry Mappings"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(repo)}
            className="p-1.5 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 hover:bg-rose-950/40 border border-white/10 dark:border-white/10 light:border-zinc-300 text-zinc-400 hover:text-rose-400 transition-colors"
            title="Disconnect Repository"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Sentry Project Mappings Section (Apple Liquid Glass) ───── */}
      <div className="p-3.5 sm:p-4 rounded-xl liquid-glass space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Radio className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-200 dark:text-zinc-200 light:text-zinc-800 tracking-wide uppercase font-mono">
              Linked Sentry Projects
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40">
              {repo.sentry_mappings?.length || 0} Connected
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenWebhookGuide(repo)}
            className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 self-start sm:self-auto font-mono"
          >
            <Activity className="w-3 h-3 text-emerald-400 glow-emerald" />
            <span>Webhook Instructions</span>
          </button>
        </div>

        {repo.sentry_mappings && repo.sentry_mappings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {repo.sentry_mappings.map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 glow-emerald flex-shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <div className="font-mono font-medium text-white dark:text-white light:text-zinc-950 truncate flex items-center gap-1.5">
                      <span className="text-zinc-500">{mapping.organization_slug}/</span>
                      <span className="text-purple-300 dark:text-purple-300 light:text-purple-600">{mapping.project_slug}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span className="uppercase text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-semibold tracking-wider">
                        {mapping.environment}
                      </span>
                      {mapping.path_prefix && (
                        <span>• path: {mapping.path_prefix}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-400 light:text-zinc-500 block">
                    {mapping.last_event_at
                      ? `Active ${formatRelativeTime(mapping.last_event_at)}`
                      : "Telemetry ready"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center rounded-xl border border-dashed border-white/10 dark:border-white/10 light:border-zinc-300 text-xs text-zinc-500 font-mono">
            No Sentry projects linked yet. Click Edit to map an alert project.
          </div>
        )}
      </div>

      {/* ── AutoHeal Policy & Autonomous Switch ─────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        {/* Remediation Mode Selector */}
        <div className="space-y-1.5 flex-1">
          <label className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-medium flex items-center gap-1.5 font-mono">
            <Bot className="w-3.5 h-3.5 text-emerald-400 glow-emerald" />
            <span>Remediation Policy & Automation Level</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(
              [
                { id: "autonomous", label: "Autonomous", desc: "Auto-PR + Merge" },
                { id: "draft_pr", label: "Draft PR", desc: "Human Review" },
                { id: "manual_approval", label: "Proposal Only", desc: "Dry-run RCA" },
                { id: "disabled", label: "Disabled", desc: "Alerts Only" },
              ] as const
            ).map((mode) => {
              const active = repo.remediation_mode === mode.id;
              return (
                <button
                  type="button"
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  disabled={isChangingMode}
                  className={cn(
                    "text-left p-2.5 rounded-xl border text-xs transition-all font-mono",
                    active
                      ? mode.id === "autonomous"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 glow-emerald"
                        : mode.id === "draft_pr"
                        ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                        : mode.id === "manual_approval"
                        ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                        : "bg-white/[0.08] dark:bg-white/[0.08] light:bg-zinc-200 border-white/20 dark:border-white/20 light:border-zinc-300 text-zinc-300"
                      : "bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-100 border-white/10 dark:border-white/10 light:border-zinc-200 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-950"
                  )}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>{mode.label}</span>
                    {active && <Check className="w-3 h-3 flex-shrink-0" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-zinc-500 mt-0.5">{mode.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Master Auto-Heal Toggle */}
        <div className="flex sm:flex-col lg:items-end justify-between sm:justify-center p-3 rounded-xl liquid-glass gap-1.5 min-w-[170px]">
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono">Autonomous Engine</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={repo.auto_heal_enabled}
              onChange={handleToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/[0.1] dark:bg-white/[0.1] light:bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:glow-emerald"></div>
            <span className="ml-2.5 text-xs font-semibold text-white dark:text-white light:text-zinc-950 font-mono">
              {repo.auto_heal_enabled ? "Active" : "Paused"}
            </span>
          </label>
        </div>
      </div>

      {/* ── Diagnostics & Runtime Footer ────────────────────────────── */}
      <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-3">
          {/* Test Runner */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 font-mono text-[11px] text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
            <Terminal className="w-3 h-3 text-zinc-400" />
            {repo.sandbox_test_cmd}
          </span>

          {/* AI Model */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 font-mono text-[11px] text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
            <Cpu className="w-3 h-3 text-purple-400" />
            {repo.llm_model}
          </span>

          {/* Webhook Status */}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                repo.webhook_active ? "bg-emerald-400 glow-emerald" : "bg-rose-500 glow-crimson"
              )}
            />
            <span className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
              Webhook: <span className="text-white dark:text-white light:text-zinc-900 font-medium">{repo.webhook_active ? "Live" : "Inactive"}</span>
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
          <span className="flex items-center gap-1">
            <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
            <strong className="text-white dark:text-white light:text-zinc-950 font-bold">{repo.total_prs_opened}</strong> PRs
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 glow-emerald" />
            <strong className="text-white dark:text-white light:text-zinc-950 font-bold">{repo.total_incidents_resolved}</strong> Healed
          </span>
          <span>•</span>
          <span className="text-zinc-500">
            Synced {formatRelativeTime(repo.last_synced_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
