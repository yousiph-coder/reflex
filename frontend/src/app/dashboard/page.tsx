"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  FolderGit2,
  Heart,
  PartyPopper,
  RefreshCw,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { AnalyticsMetrics, AnalyticsOverview } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/context/ToastContext";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { IncidentTrendChart } from "@/components/dashboard/IncidentTrendChart";
import { ResolutionPieChart } from "@/components/dashboard/ResolutionPieChart";
import { TopIssuesList } from "@/components/dashboard/TopIssuesList";
import { HealthRadarWidget } from "@/components/dashboard/HealthRadarWidget";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrg, billingUsage, refreshUsage, openUpgradeModal } = useTenant();
  const toast = useToast();

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toLowerCase();
  const isPro = activePlan === "pro" || activePlan === "enterprise";
  const healsUsed = billingUsage?.heals_used ?? 0;
  const maxLimit = billingUsage?.limit ?? 5;
  const isApproachingLimit = !isPro && (healsUsed >= 4 || healsUsed >= maxLimit);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const [data, overviewData] = await Promise.all([
        apiClient.getMetrics().catch(() => null),
        apiClient.getOverviewMetrics().catch(() => null),
      ]);
      setMetrics(data);
      setOverview(overviewData);
    } catch (err) {
      console.error("Failed to load metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    refreshUsage();
  }, [refreshUsage]);

  // Detect URL query param ?billing=success
  useEffect(() => {
    const billingParam = searchParams.get("billing");
    if (billingParam === "success") {
      toast.success(
        "Welcome to AutoHeal Pro!",
        "Unlimited autonomous remediations and priority sandbox runners are now active."
      );
      refreshUsage();
      router.replace("/dashboard");
    } else if (billingParam === "canceled") {
      router.replace("/dashboard");
    }
  }, [searchParams, router, refreshUsage, toast]);

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono flex items-center gap-2.5">
            Engineering Reliability Overview
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-sans leading-relaxed">
            Real-time closed-loop incident detection, AI root-cause analysis, and verified PR generation.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMetrics}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10 hover:border-emerald-500/40 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all select-none self-start sm:self-auto"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-emerald-500")} />
          Refresh Metrics
        </button>
      </div>

      {/* ── Gentle Free-Tier Usage Limit Banner (Reveals ONLY when approaching limit) ── */}
      {isApproachingLimit && (
        <div className="p-4 sm:p-5 rounded-2xl liquid-glass-elevated border border-amber-500/40 bg-amber-500/5 shadow-glow-amber flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-glow-amber">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold font-mono text-zinc-900 dark:text-white">
                  Approaching Monthly Autonomous Heal Quota
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {healsUsed} / {maxLimit} HEALS
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-sans leading-relaxed">
                {healsUsed >= maxLimit
                  ? "You have reached your free tier monthly limit (5/5). Autonomous PR opening is paused until next cycle."
                  : `You have only ${maxLimit - healsUsed} autonomous heal remaining before automatic PR creation pauses.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openUpgradeModal}
            className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-black bg-emerald-500 hover:bg-emerald-400 shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all font-mono"
          >
            <Zap className="w-3.5 h-3.5 text-black fill-black" />
            <span>Upgrade to Pro ($29/mo)</span>
          </button>
        </div>
      )}

      {/* ── Top KPI Metrics Cards (Spacious, Glassmorphic) ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Auto-Healed PRs"
          value={overview?.incidents.healed_prs ?? (metrics?.resolved_incidents || 0)}
          subtitle={
            overview && overview.roi.roi_multiplier > 0
              ? `${overview.roi.roi_multiplier}x ROI vs $29 Pro plan (${overview.roi.hours_saved}h saved)`
              : "Closed-loop PRs created & verified"
          }
          trend={{
            value: overview
              ? `+$${overview.roi.cost_saved_usd} saved (${overview.roi.hours_saved}h)`
              : "0h saved (~$0)",
            positive: true,
          }}
          icon={CheckCircle2}
          badgeColor="emerald"
        />

        <MetricCard
          title="Mean Time To Remediation"
          value={
            overview?.incidents.mttr_seconds
              ? `${overview.incidents.mttr_seconds}s`
              : "—"
          }
          subtitle="From crash capture to PR opened"
          trend={{ value: "Real-time MTTR", positive: true }}
          icon={Clock}
          badgeColor="purple"
        />

        <MetricCard
          title="Active Monitoring Coverage"
          value={
            overview
              ? `${overview.repositories.total} ${overview.repositories.total === 1 ? "Repo" : "Repos"}`
              : "0 Repos"
          }
          subtitle="Sentry & GitHub webhooks live"
          trend={{
            value: (overview?.repositories.total ?? 0) > 0 ? "100% Operational" : "0% Operational",
            positive: (overview?.repositories.total ?? 0) > 0,
          }}
          icon={Cpu}
          badgeColor="blue"
        />

        <MetricCard
          title="ENGINEERING ROI & SAVED"
          value={`${overview?.roi.hours_saved ?? 0} hrs`}
          subtitle={`${overview?.incidents.healed_prs ?? (metrics?.resolved_incidents || 0)} verified PR(s) × 2.5h avg triage (@$65/hr)`}
          trend={{
            value: `~$${overview?.roi.cost_saved_usd ?? 0} saved`,
            positive: true,
          }}
          icon={DollarSign}
          badgeColor="emerald"
        />
      </div>

      {/* ── System Stability Radar & Resolution Charts ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <HealthRadarWidget
            healthPct={overview?.vitality_score ?? 100.0}
            monitoredServices={overview?.repositories.total ?? 0}
            roi={overview?.roi}
          />
        </div>
        <div className="lg:col-span-7">
          <ResolutionPieChart
            resolved={overview ? overview.incidents.healed_prs : (metrics?.resolved_incidents || 0)}
            remediating={overview ? overview.incidents.remediating : (metrics?.remediating_incidents || 0)}
            failed={overview ? overview.incidents.failed : (metrics?.failed_incidents || 0)}
            pending={overview ? overview.incidents.pending : (metrics?.pending_incidents || 0)}
            successRate={overview?.incidents.success_rate}
          />
        </div>
      </div>

      {/* ── Incident Trends Chart ────────────────────────────────── */}
      <div>
        <IncidentTrendChart />
      </div>

      {/* ── Live Activity Stream Timeline ────────────────────────── */}
      <div>
        <ActivityTimeline />
      </div>

      {/* ── Top Crash Locations & Exception Rankings ─────────────── */}
      {metrics && (
        <TopIssuesList
          topFiles={metrics.top_failing_files}
          topErrors={metrics.top_error_types}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-zinc-500 font-mono text-xs">
          Loading dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
