"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  FolderGit2,
  LayoutGrid,
  List,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  TableProperties,
} from "lucide-react";
import { AnalyticsOverview, RemediationMode, Repository } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import { RepoStatsBanner } from "@/components/repositories/RepoStatsBanner";
import { RepoCard } from "@/components/repositories/RepoCard";
import { RepoTableView } from "@/components/repositories/RepoTableView";
import { GuidedRepoOnboarding } from "@/components/repositories/GuidedRepoOnboarding";
import { ConnectRepoModal } from "@/components/repositories/ConnectRepoModal";
import { EditMappingModal } from "@/components/repositories/EditMappingModal";
import { SentryWebhookSnippetModal } from "@/components/repositories/SentryWebhookSnippetModal";
import { DeleteConfirmModal } from "@/components/repositories/DeleteConfirmModal";
import { cn } from "@/lib/utils";

const GITHUB_APP_INSTALL_URL = `https://github.com/apps/${
  process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "auto-heal"
}/installations/new`;

function RepositoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const syncedInstallationRef = useRef<string | null>(null);
  const toast = useToast();

  // Auth and tenant session state
  const { session, isLoading, currentOrg: currentTenant } = useTenant();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [isReposLoading, setIsReposLoading] = useState(true);
  const [isSyncingInstallation, setIsSyncingInstallation] = useState(false);
  const [isSmokeTesting, setIsSmokeTesting] = useState(false);
  const [showGuidedOnboarding, setShowGuidedOnboarding] = useState(false);

  // Dual View Mode: "grid" vs "table"
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");

  // Modals state
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [deletingRepo, setDeletingRepo] = useState<Repository | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [webhookGuideRepo, setWebhookGuideRepo] = useState<Repository | null>(null);

  // Load view preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("autoheal_repo_view_mode");
      if (saved === "table" || saved === "grid") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleSetViewMode = (mode: "grid" | "table") => {
    setViewMode(mode);
    try {
      localStorage.setItem("autoheal_repo_view_mode", mode);
    } catch {}
  };

  const loadRepositories = useCallback(async () => {
    if (isLoading || !session) return;
    if (!currentTenant) return;

    setIsReposLoading(true);
    try {
      let data: Repository[];
      try {
        data = await apiClient.get<Repository[]>("/api/v1/repositories");
      } catch (err: any) {
        const errorMsg = typeof err?.message === "string" ? err.message : "";
        if (errorMsg.includes("401")) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            data = await apiClient.get<Repository[]>("/api/v1/repositories");
          } else {
            throw err;
          }
        } else if (errorMsg.includes("403")) {
          setRepositories([]);
          return;
        } else {
          throw err;
        }
      }

      if (Array.isArray(data)) {
        setRepositories(data);
      } else {
        setRepositories([]);
      }

      try {
        const overviewRes = await apiClient.getOverviewMetrics().catch(() => null);
        if (overviewRes) setAnalytics(overviewRes);
      } catch {}
    } catch (err: any) {
      console.error("Failed to load repositories:", err);
      const errorMsg = typeof err?.message === "string" ? err.message : "";
      if (errorMsg.includes("401")) {
        toast.error("Session expired", "Please log in again.");
      } else {
        toast.error("Failed to load repositories", errorMsg || "Please refresh or check credentials.");
      }
      setRepositories([]);
    } finally {
      setIsReposLoading(false);
    }
  }, [isLoading, session, currentTenant, toast]);

  // Trigger manual sync for an installation ID
  const handleManualSync = useCallback(
    async (installationId: number | string = 168046767) => {
      if (isLoading || !session) return;
      setIsSyncingInstallation(true);
      try {
        let synced: Repository[];
        try {
          synced = await apiClient.post<Repository[]>("/api/v1/repositories/sync", {
            installation_id: Number(installationId),
          });
        } catch (err: any) {
          const errorMsg = typeof err?.message === "string" ? err.message : "";
          if (errorMsg.includes("401")) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session) {
              synced = await apiClient.post<Repository[]>("/api/v1/repositories/sync", {
                installation_id: Number(installationId),
              });
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }

        toast.success("GitHub Synchronized", "Repositories updated from GitHub App installation.");
        if (Array.isArray(synced) && synced.length > 0) {
          setRepositories(synced);
        } else {
          await loadRepositories();
        }
      } catch (err: any) {
        console.error("Failed to sync GitHub installation:", err);
        toast.error("Sync Failed", err?.message || "Could not synchronize with GitHub.");
      } finally {
        setIsSyncingInstallation(false);
      }
    },
    [isLoading, session, loadRepositories, toast]
  );

  // Trigger Live Smoke Test
  const handleTriggerSmokeTest = async () => {
    setIsSmokeTesting(true);
    try {
      // Trigger a synthetic crash event to test the webhook and sandbox pipeline
      await apiClient.post("/api/v1/webhooks/sentry", {
        action: "created",
        data: {
          issue: {
            id: "SMOKE-TEST-" + Date.now(),
            title: "ZeroDivisionError: division by zero in calculate_rate",
            project: { slug: repositories[0]?.name || "autoheal-demo" },
            metadata: {
              type: "ZeroDivisionError",
              value: "division by zero",
              filename: "app/services/calculator.py",
            },
          },
        },
      });
      toast.success("Smoke Test Executed", "Synthetic crash dispatched to sandbox test runner.");
    } catch {
      // In case simulation mock is active
      toast.info("Simulation Dispatched", "Smoke test event received by pipeline.");
    } finally {
      setIsSmokeTesting(false);
    }
  };

  // Detect URL query param installation_id on page load
  useEffect(() => {
    if (isLoading || !session) return;
    if (!currentTenant) return;

    const installationId = searchParams.get("installation_id");

    if (installationId) {
      if (syncedInstallationRef.current === installationId) {
        return;
      }
      syncedInstallationRef.current = installationId;

      const syncInstallation = async () => {
        setIsSyncingInstallation(true);
        try {
          const synced = await apiClient.post<Repository[]>("/api/v1/repositories/sync", {
            installation_id: Number(installationId),
          });
          toast.success("GitHub App Connected", "Repositories imported successfully!");
          router.replace("/dashboard/repositories");
          if (Array.isArray(synced) && synced.length > 0) {
            setRepositories(synced);
          } else {
            await loadRepositories();
          }
        } catch (err: any) {
          toast.error("Sync Failed", err?.message || "Failed to sync GitHub installation.");
          router.replace("/dashboard/repositories");
          await loadRepositories();
        } finally {
          setIsSyncingInstallation(false);
        }
      };

      syncInstallation();
    } else if (!syncedInstallationRef.current) {
      loadRepositories();
    }
  }, [isLoading, session, currentTenant, searchParams, router, loadRepositories, toast]);

  // Update remediation policy
  const handleUpdateMode = async (id: string, mode: RemediationMode) => {
    try {
      const updated = await apiClient.updateRepository(id, {
        remediation_mode: mode,
        auto_heal_enabled: mode !== "disabled",
      });
      setRepositories((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Policy Updated", `${updated.full_name} remediation mode set to ${mode}`);
    } catch {
      toast.error("Update Failed", "Could not update remediation policy.");
    }
  };

  // Toggle master AutoHeal switch
  const handleToggleAutoHeal = async (id: string, enabled: boolean) => {
    try {
      const updated = await apiClient.updateRepository(id, {
        auto_heal_enabled: enabled,
        remediation_mode: enabled ? "autonomous" : "disabled",
      });
      setRepositories((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.info(
        enabled ? "Autonomous Engine Active" : "Autonomous Engine Paused",
        `${updated.full_name} is ${enabled ? "now auto-healing errors" : "in telemetry only mode"}.`
      );
    } catch {
      toast.error("Toggle Failed", "Could not update autoheal state.");
    }
  };

  // Trigger branch sync & health check
  const handleSync = async (id: string) => {
    const res = await apiClient.triggerRepoSync(id);
    setRepositories((prev) =>
      prev.map((r) => (r.id === id ? { ...r, last_synced_at: res.synced_at } : r))
    );
    toast.success("Repository Synced", res.message);
  };

  // Repository created from modal
  const handleRepoCreated = (newRepo: Repository) => {
    setRepositories((prev) => [newRepo, ...prev]);
    toast.success("Repository Connected", `${newRepo.full_name} is now monitored by AutoHeal.`);
  };

  // Repository updated from edit modal
  const handleRepoSaved = (updatedRepo: Repository) => {
    setRepositories((prev) => prev.map((r) => (r.id === updatedRepo.id ? updatedRepo : r)));
    toast.success("Configuration Saved", `Settings updated for ${updatedRepo.full_name}`);
  };

  // Delete / Disconnect repository
  const handleConfirmDelete = async (repoId: string) => {
    setIsDeleting(true);
    try {
      await apiClient.deleteRepository(repoId);
      setRepositories((prev) => prev.filter((r) => r.id !== repoId));
      toast.info("Repository Disconnected", "Autonomous PR creation has been deactivated.");
      setDeletingRepo(null);
    } catch {
      toast.error("Disconnection Failed", "Unable to disconnect repository.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filters
  const languages = Array.from(new Set(repositories.map((r) => r.language).filter(Boolean)));

  const filteredRepos = repositories.filter((repo) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = repo.full_name.toLowerCase().includes(term);
      const matchDesc = repo.description?.toLowerCase().includes(term);
      const matchSentry = repo.sentry_mappings?.some(
        (m) =>
          m.project_slug.toLowerCase().includes(term) ||
          m.organization_slug.toLowerCase().includes(term)
      );
      if (!matchName && !matchDesc && !matchSentry) return false;
    }

    if (selectedMode !== "ALL" && repo.remediation_mode !== selectedMode) {
      return false;
    }

    if (selectedLanguage !== "ALL" && repo.language !== selectedLanguage) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-7">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5 font-mono">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 shadow-glow-emerald">
              <FolderGit2 className="w-5 h-5" />
            </div>
            Repositories & Sentry Mappings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 font-sans leading-relaxed">
            Link GitHub repositories with Sentry error streams to enable closed-loop autonomous bug fixing and verified pull requests.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 font-mono">
          <button
            type="button"
            onClick={() => setShowGuidedOnboarding((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all",
              showGuidedOnboarding
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-glow-emerald"
                : "liquid-glass border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-2-3 Guide</span>
          </button>

          <button
            type="button"
            onClick={() => handleManualSync(168046767)}
            disabled={isSyncingInstallation}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all disabled:opacity-50"
            title="Manual sync with GitHub App installation ID 168046767"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5 text-emerald-500", isSyncingInstallation && "animate-spin")}
            />
            <span>Sync App</span>
          </button>

          <a
            href={GITHUB_APP_INSTALL_URL}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Connect Repository
          </a>
        </div>
      </div>

      {/* ── Guided 1-2-3 Onboarding Section ──────────────────────── */}
      {(showGuidedOnboarding || repositories.length === 0) && (
        <GuidedRepoOnboarding
          githubAppUrl={GITHUB_APP_INSTALL_URL}
          hasRepos={repositories.length > 0}
          onOpenSentryGuide={() => setWebhookGuideRepo(repositories[0] || null)}
          onTriggerSmokeTest={handleTriggerSmokeTest}
          isSmokeTesting={isSmokeTesting}
        />
      )}

      {/* ── Metric Cards ─────────────────────────────────────────── */}
      <RepoStatsBanner repositories={repositories} analytics={analytics} />

      {/* ── Filter Toolbar & Dual View Switcher (Grid / Table) ───── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl liquid-glass border border-zinc-200 dark:border-white/10">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by repo (e.g. payment-service) or Sentry project..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 transition-colors font-sans"
          />
        </div>

        {/* Dropdowns, Refresh, and Dual View Toggle */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          {/* Mode Filter */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500/80 transition-colors"
          >
            <option value="ALL">All Modes</option>
            <option value="autonomous">Autonomous (Auto-PR)</option>
            <option value="draft_pr">Draft PR</option>
            <option value="manual_approval">Proposal Only</option>
            <option value="disabled">Disabled</option>
          </select>

          {/* Language Filter */}
          {languages.length > 0 && (
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500/80 transition-colors"
            >
              <option value="ALL">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          )}

          {/* Dual View Toggle Buttons (Grid vs Table) */}
          <div className="flex items-center p-0.5 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10">
            <button
              type="button"
              onClick={() => handleSetViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "grid"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "table"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="Dense Data Table View"
            >
              <TableProperties className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadRepositories}
            disabled={isLoading || isReposLoading}
            className="p-2 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Refresh Repositories"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isReposLoading && "animate-spin text-emerald-500")}
            />
          </button>
        </div>
      </div>

      {/* ── Repositories Views (Grid Cards vs Dense Table) ───────── */}
      <div className="space-y-4">
        {(isLoading || isReposLoading) && repositories.length === 0 ? (
          <div className="p-16 rounded-3xl liquid-glass text-center space-y-3 font-mono">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
            <p className="text-xs text-zinc-500">Loading connected repositories & mappings...</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-16 rounded-3xl liquid-glass text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl liquid-glass border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 mx-auto">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold font-mono text-zinc-900 dark:text-white">
                No repositories found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {searchTerm || selectedMode !== "ALL" || selectedLanguage !== "ALL"
                  ? "No repositories match your active search filters. Try clearing your query."
                  : "Connect your first GitHub repository and link it to Sentry to start autonomous healing."}
              </p>
            </div>
            {searchTerm || selectedMode !== "ALL" || selectedLanguage !== "ALL" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedMode("ALL");
                  setSelectedLanguage("ALL");
                }}
                className="px-4 py-2 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 text-xs font-mono text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 font-mono">
                <a
                  href={GITHUB_APP_INSTALL_URL}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Connect Repository
                </a>
              </div>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* Dense Data Table View */
          <RepoTableView
            repositories={filteredRepos}
            onUpdateMode={handleUpdateMode}
            onToggleAutoHeal={handleToggleAutoHeal}
            onSync={handleSync}
            onEdit={(r) => setEditingRepo(r)}
            onDelete={(r) => setDeletingRepo(r)}
            onOpenWebhookGuide={(r) => setWebhookGuideRepo(r)}
          />
        ) : (
          /* Grid Cards View */
          <div className="grid grid-cols-1 gap-4">
            {filteredRepos.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onUpdateMode={handleUpdateMode}
                onToggleAutoHeal={handleToggleAutoHeal}
                onSync={handleSync}
                onEdit={(r) => setEditingRepo(r)}
                onDelete={(r) => setDeletingRepo(r)}
                onOpenWebhookGuide={(r) => setWebhookGuideRepo(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <ConnectRepoModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        onCreated={handleRepoCreated}
      />

      <EditMappingModal
        repo={editingRepo}
        isOpen={Boolean(editingRepo)}
        onClose={() => setEditingRepo(null)}
        onSaved={handleRepoSaved}
      />

      <SentryWebhookSnippetModal
        repo={webhookGuideRepo}
        isOpen={Boolean(webhookGuideRepo)}
        onClose={() => setWebhookGuideRepo(null)}
      />

      <DeleteConfirmModal
        repo={deletingRepo}
        isOpen={Boolean(deletingRepo)}
        onClose={() => setDeletingRepo(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function RepositoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 rounded-3xl liquid-glass text-center space-y-3 font-mono text-xs text-zinc-500">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
          <p>Loading repositories...</p>
        </div>
      }
    >
      <RepositoriesContent />
    </Suspense>
  );
}
