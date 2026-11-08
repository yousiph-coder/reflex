"use client";

import { useState } from "react";
import {
  Activity,
  Bot,
  ExternalLink,
  GitBranch,
  Radio,
  RefreshCw,
  Settings2,
  Trash2,
  Zap,
} from "lucide-react";
import { RemediationMode, Repository } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface RepoTableViewProps {
  repositories: Repository[];
  onUpdateMode: (id: string, mode: RemediationMode) => Promise<void>;
  onToggleAutoHeal: (id: string, enabled: boolean) => Promise<void>;
  onSync: (id: string) => Promise<void>;
  onEdit: (repo: Repository) => void;
  onDelete: (repo: Repository) => void;
  onOpenWebhookGuide: (repo: Repository) => void;
}

export function RepoTableView({
  repositories,
  onUpdateMode,
  onToggleAutoHeal,
  onSync,
  onEdit,
  onDelete,
  onOpenWebhookGuide,
}: RepoTableViewProps) {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSyncClick = async (id: string) => {
    setSyncingId(id);
    try {
      await onSync(id);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="rounded-2xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="bg-zinc-100/70 dark:bg-black/60 border-b border-zinc-200 dark:border-white/10 text-zinc-500 font-mono uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Repository</th>
              <th className="py-3.5 px-3 font-semibold">Target Branch</th>
              <th className="py-3.5 px-3 font-semibold">Webhook Heartbeat</th>
              <th className="py-3.5 px-3 font-semibold">Autonomous Policy</th>
              <th className="py-3.5 px-3 font-semibold">Last Auto-Heal</th>
              <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
            {repositories.map((repo) => {
              const isSyncing = syncingId === repo.id;
              const hasMappings = Boolean(repo.sentry_mappings && repo.sentry_mappings.length > 0);
              const mapping = repo.sentry_mappings?.[0];

              return (
                <tr
                  key={repo.id}
                  className="hover:bg-zinc-100/50 dark:hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Repository Name & Monorepo path */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 font-mono font-bold text-xs flex-shrink-0">
                        {repo.language ? repo.language.substring(0, 2).toUpperCase() : "GH"}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={`https://github.com/${repo.full_name}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold font-mono text-zinc-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 truncate"
                        >
                          <span>{repo.full_name}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                        </a>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{repo.language || "Polyglot"}</span>
                          {repo.root_directory && repo.root_directory !== "/" && (
                            <>
                              <span>•</span>
                              <span className="text-zinc-400">root: {repo.root_directory}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Target Branch Badge */}
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      <GitBranch className="w-3 h-3 text-purple-400" />
                      {repo.default_branch || "main"}
                    </span>
                  </td>

                  {/* Live Webhook Heartbeat */}
                  <td className="py-3.5 px-3">
                    {hasMappings ? (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-glow-emerald" />
                        </span>
                        <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                          <span className="text-[10px] text-zinc-500 block">
                            {mapping?.project_slug}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenWebhookGuide(repo)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-500 hover:text-amber-400"
                      >
                        <Radio className="w-3 h-3" />
                        <span>Link Sentry</span>
                      </button>
                    )}
                  </td>

                  {/* Remediation Policy Selector */}
                  <td className="py-3.5 px-3">
                    <select
                      value={repo.remediation_mode}
                      onChange={(e) => onUpdateMode(repo.id, e.target.value as RemediationMode)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-mono font-medium border focus:outline-none transition-colors",
                        repo.remediation_mode === "autonomous" &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                        repo.remediation_mode === "draft_pr" &&
                          "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
                        repo.remediation_mode === "manual_approval" &&
                          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                        repo.remediation_mode === "disabled" &&
                          "bg-zinc-100 dark:bg-white/5 text-zinc-500 border-zinc-200 dark:border-white/10"
                      )}
                    >
                      <option value="autonomous">Autonomous</option>
                      <option value="draft_pr">Draft PR</option>
                      <option value="manual_approval">Proposal</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </td>

                  {/* Last Auto-Heal Event */}
                  <td className="py-3.5 px-3 font-mono text-xs text-zinc-500">
                    {repo.last_synced_at ? (
                      formatRelativeTime(repo.last_synced_at)
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600">Never</span>
                    )}
                  </td>

                  {/* Actions: Sync, Edit, Delete */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 font-mono">
                      {/* One-Click Sync */}
                      <button
                        type="button"
                        onClick={() => handleSyncClick(repo.id)}
                        disabled={isSyncing}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                        title="Sync latest branch commits"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-emerald-500")} />
                      </button>

                      {/* Edit Mapping */}
                      <button
                        type="button"
                        onClick={() => onEdit(repo)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        title="Configure settings & mappings"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Disconnect */}
                      <button
                        type="button"
                        onClick={() => onDelete(repo)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Disconnect repository"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
