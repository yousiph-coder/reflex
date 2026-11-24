"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FolderGit2,
  GitBranch,
  Plus,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  HeartPulse,
  Terminal,
  Search,
  Lock,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Repository } from "@/lib/types";

const INSTALL_ID_KEY = "reflex_github_installation_id";

function RepositoriesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [installationId, setInstallationId] = useState<string>("185362414");

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3600);
  }, []);

  // Load real repositories from FastAPI / PostgreSQL
  const fetchLiveRepos = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await apiClient.getRepositories();
      setRepos(data || []);
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Could not load repositories from backend (check FastAPI server)."
      );
      setRepos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync directly with GitHub App Installation ID
  const handleSyncGithub = useCallback(
    async (overrideInstallId?: string) => {
      const targetId = overrideInstallId || installationId;
      if (!targetId) {
        showToast("Missing GitHub Installation ID. Click 'Install on New Repo' first.");
        return;
      }
      try {
        setIsSyncing(true);
        setErrorMsg(null);
        showToast(`Syncing repositories from GitHub Installation #${targetId}...`);
        const synced = await apiClient.syncRepositories(targetId);
        setRepos(synced || []);
        showToast(
          `Synced ${synced?.length ?? 0} live repositories from GitHub (#${targetId})!`
        );
      } catch (err: any) {
        setErrorMsg(
          err?.message || "GitHub sync failed. Make sure FastAPI backend is running."
        );
      } finally {
        setIsSyncing(false);
      }
    },
    [installationId, showToast]
  );

  // On mount: detect ?installation_id=... callback from GitHub App install!
  useEffect(() => {
    const urlInstallId = searchParams.get("installation_id");
    let savedId = "185362414";
    try {
      const stored = localStorage.getItem(INSTALL_ID_KEY);
      if (stored) savedId = stored;
    } catch {}

    if (urlInstallId) {
      setInstallationId(urlInstallId);
      try {
        localStorage.setItem(INSTALL_ID_KEY, urlInstallId);
      } catch {}
      // Automatically sync the newly installed GitHub repositories!
      handleSyncGithub(urlInstallId).then(() => {
        router.replace("/dashboard/repositories");
      });
    } else {
      setInstallationId(savedId);
      fetchLiveRepos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle Auto-PR live in PostgreSQL
  const handleToggleAutoPr = async (repo: Repository) => {
    const nextEnabled = !repo.auto_heal_enabled;
    setRepos((prev) =>
      prev.map((r) =>
        r.id === repo.id ? { ...r, auto_heal_enabled: nextEnabled } : r
      )
    );
    try {
      await apiClient.updateRepository(repo.id, {
        auto_heal_enabled: nextEnabled,
      });
      showToast(
        `Autonomous PR ${nextEnabled ? "enabled" : "paused"} for ${repo.full_name}`
      );
    } catch {
      // Revert if API fails
      setRepos((prev) =>
        prev.map((r) =>
          r.id === repo.id ? { ...r, auto_heal_enabled: !nextEnabled } : r
        )
      );
      showToast("Failed to update repository setting on backend.");
    }
  };

  // Delete Repository live from PostgreSQL
  const handleDeleteRepo = async (repo: Repository) => {
    try {
      await apiClient.deleteRepository(repo.id);
      setRepos((prev) => prev.filter((r) => r.id !== repo.id));
      showToast(`Removed ${repo.full_name} from Reflex.`);
    } catch {
      showToast(`Could not delete ${repo.full_name}. Check backend connection.`);
    }
  };

  // Trigger single repo branch sync
  const handleTriggerRepoSync = async (repo: Repository) => {
    try {
      showToast(`Syncing branch '${repo.default_branch}' for ${repo.full_name}...`);
      const res = await apiClient.triggerRepoSync(repo.id);
      showToast(res.message);
    } catch (err: any) {
      showToast(err?.message || `Sync failed for ${repo.full_name}`);
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.language || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-16">
      {/* Ambient Background Spotlight Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[960px] h-[420px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)",
          }}
        />
      </div>

      {/* 1. TOP HEADER & GITHUB APP TELEMETRY */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              GitHub App ID: 5193276 · Installation #{installationId} Live
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Connected Repositories
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleSyncGithub()}
            disabled={isSyncing}
            className="px-3.5 py-2.5 rounded-xl font-mono text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5 transition-all disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-indigo-500 ${
                isSyncing ? "animate-spin" : ""
              }`}
            />
            <span>{isSyncing ? "Syncing..." : "Sync GitHub"}</span>
          </button>

          <a
            href="https://github.com/apps/auto-heal/installations/new"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.35)] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Install on New Repo</span>
          </a>
        </div>
      </div>

      {/* Error Banner if Backend is unreachable */}
      {errorMsg && (
        <div className="relative z-10 p-4 rounded-2xl border border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-mono text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={fetchLiveRepos}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. SEARCH BAR & SUMMARY */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connected repositories..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-mono bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Live PostgreSQL Sync · {repos.length} Repositories Connected</span>
        </div>
      </div>

      {/* 3. LOADING / EMPTY / LIVE REPOSITORY CARDS */}
      {isLoading ? (
        <div className="relative z-10 py-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Loading connected repositories from Reflex backend...</span>
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="relative z-10 rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-white/60 dark:bg-[#0b0d17]/60 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 mx-auto">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              No repositories connected yet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Click <strong>Sync GitHub</strong> to pull repositories from Installation #{installationId}, or install the GitHub App on a new repository.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleSyncGithub()}
              className="px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500"
            >
              Sync Installation #{installationId}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 hover:border-indigo-500/40 shadow-sm transition-all flex flex-col justify-between space-y-6"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                    <FolderGit2 className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <a
                      href={`https://github.com/${repo.full_name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-base font-bold text-slate-950 dark:text-white hover:text-indigo-500 dark:hover:text-indigo-400 flex items-center gap-1.5 truncate"
                    >
                      <span className="truncate">{repo.full_name}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    </a>

                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-indigo-400" />
                        {repo.default_branch}
                      </span>
                      <span>·</span>
                      <span>{repo.language || "Auto-detect"}</span>
                    </div>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full font-mono text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                  <HeartPulse className="w-3.5 h-3.5" />
                  {repo.status === "connected" ? "Active" : "Sync Error"}
                </span>
              </div>

              {/* 3 Live Telemetry Boxes */}
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="rounded-2xl border p-3.5 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
                  <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">
                    Healed PRs
                  </div>
                  <div className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {repo.healed_prs_count ?? repo.total_incidents_resolved ?? 0}
                  </div>
                </div>

                <div className="rounded-2xl border p-3.5 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
                  <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">
                    Open Crashes
                  </div>
                  <div className="mt-1 text-lg font-bold text-sky-600 dark:text-sky-400">
                    {repo.open_incidents_count ?? 0}
                  </div>
                </div>

                <div className="rounded-2xl border p-3.5 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10">
                  <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">
                    Test Runner
                  </div>
                  <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate pt-1">
                    {repo.sandbox_test_cmd || "pytest / npm test"}
                  </div>
                </div>
              </div>

              {/* Footer Controls */}
              <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleAutoPr(repo)}
                  className="flex items-center gap-2.5 text-xs font-mono"
                >
                  <span
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                      repo.auto_heal_enabled
                        ? "bg-indigo-500 justify-end"
                        : "bg-slate-300 dark:bg-white/15 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow" />
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Auto-PR on Crash
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTriggerRepoSync(repo)}
                    className="px-3 py-1.5 rounded-xl font-mono text-xs font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sync Branch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRepo(repo)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-rose-500/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Disconnect repository"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

export default function ReflexRepositoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 flex items-center justify-center text-slate-400 font-mono text-xs">
          Loading repositories...
        </div>
      }
    >
      <RepositoriesContent />
    </Suspense>
  );
}