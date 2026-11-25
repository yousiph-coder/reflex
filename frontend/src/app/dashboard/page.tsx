"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  DollarSign,
  HeartPulse,
  Zap,
  Plus,
  CheckCircle2,
  GitPullRequest,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  Activity,
  Check,
  Crown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { IncidentDetail, IncidentSummary } from "@/lib/types";
import { useTenant } from "@/context/TenantContext";

export default function ReflexDashboardPage() {
  const { currentOrg, billingUsage, openUpgradeModal } = useTenant();

  const [overview, setOverview] = useState<any>(null);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3200);
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [overviewRes, incidentsRes] = await Promise.allSettled([
        apiClient.getOverviewMetrics(),
        apiClient.getIncidents({ pageSize: 10 }),
      ]);

      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value);
      }

      if (incidentsRes.status === "fulfilled") {
        const items = incidentsRes.value?.items || [];
        setIncidents(items);
        if (items.length > 0) {
          setSelectedId((prev) => prev || items[0].id);
        } else {
          setSelectedId(null);
          setSelectedDetail(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let active = true;
    setIsDetailLoading(true);
    apiClient
      .getIncident(selectedId)
      .then((detail) => {
        if (active) setSelectedDetail(detail);
      })
      .catch(() => {
        if (active) setSelectedDetail(null);
      })
      .finally(() => {
        if (active) setIsDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const healsUsed = billingUsage?.heals_used ?? overview?.resolved_incidents ?? 0;
  const maxLimit = billingUsage?.limit ?? 5;
  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toUpperCase();
  const usagePct = Math.min(100, Math.round((healsUsed / Math.max(1, maxLimit)) * 100));

  const isHealedStatus = (status?: string) =>
    ["RESOLVED", "MERGED", "PR_MERGED", "HEALED"].includes(
      (status || "").toUpperCase()
    );

  const localResolvedCount = incidents.filter((i) =>
    isHealedStatus(i.status)
  ).length;
  const resolvedCount = Math.max(
    overview?.resolved_incidents ?? 0,
    localResolvedCount
  );

  const avgMttrSeconds = overview?.avg_mttr_seconds ?? 0;
  const mttrDisplay =
    avgMttrSeconds > 0 ? `${Math.round(avgMttrSeconds)} sec` : "—";

  const hoursSaved = (resolvedCount * 2.5).toFixed(1);
  const dollarsSaved = (resolvedCount * 162.5).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const roiMultiple =
    resolvedCount > 0 ? ((resolvedCount * 162.5) / 29).toFixed(1) : "0.0";

  const openCrashes = incidents.filter(
    (i) =>
      !isHealedStatus(i.status) &&
      (i.status || "").toUpperCase() !== "REJECTED"
  ).length;
  const vitalityDisplay =
    openCrashes === 0 ? "100%" : `${Math.max(50, 100 - openCrashes * 5)}%`;

  const kpiCards = [
    {
      title: "Reflexes Used",
      value: activePlan === "PRO" ? `${healsUsed} / ∞` : `${healsUsed} / ${maxLimit}`,
      badge: `${activePlan} Plan`,
      subtext:
        activePlan === "PRO"
          ? "Unlimited autonomous fixes active"
          : `${Math.max(0, maxLimit - healsUsed)} free fixes remaining this month`,
      icon: Zap,
      accent: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-500/10",
    },
    {
      title: "Avg Resolution Time",
      value: mttrDisplay,
      badge: "Live MTTR",
      subtext: "From Sentry crash to verified GitHub PR",
      icon: Clock,
      accent: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-500/10",
    },
    {
      title: "Engineering Saved",
      value: `$${dollarsSaved}`,
      badge: `${roiMultiple}x ROI`,
      subtext: `${hoursSaved} senior engineering hours saved @ $65/hr`,
      icon: DollarSign,
      accent: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-500/10",
    },
    {
      title: "System Vitality",
      value: vitalityDisplay,
      badge: openCrashes === 0 ? "Healthy" : `${openCrashes} Open`,
      subtext: `${currentOrg?.name || "Reflex Workspace"} · Live telemetry`,
      icon: HeartPulse,
      accent: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
  ];

  const latestAttempt = selectedDetail?.remediation_attempts?.[0];

  const handleRerunSandbox = async () => {
    if (!selectedDetail) return;
    try {
      triggerToast(`Re-running Docker Sandbox for #${selectedDetail.id.slice(0, 8)}...`);
      await apiClient.rerunSandbox(selectedDetail.id);
      triggerToast("Docker Sandbox verification completed!");
      loadDashboardData();
    } catch {
      triggerToast("Failed to trigger sandbox rerun. Check backend connection.");
    }
  };

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-14">
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

      {/* Top Section Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Mission Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            Live PostgreSQL telemetry · {incidents.length} recorded incidents
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadDashboardData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] hover:border-indigo-500/40 text-slate-600 dark:text-slate-300 transition-all"
            title="Refresh live data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
          </button>

          <Link
            href="/dashboard/repositories"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Repo</span>
          </Link>
        </div>
      </div>

      {/* 1. 4 LIVE KPI CARDS */}
      <section className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border p-5 bg-white/90 dark:bg-[#0b0d17]/85 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm hover:border-indigo-500/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBg}`}
                >
                  <Icon className={`w-4 h-4 ${card.accent}`} />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-950 dark:text-white">
                  {card.value}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                  {card.badge}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {card.subtext}
              </p>
            </div>
          );
        })}
      </section>

      {/* 2. LIVE REFLEX STUDIO (TIMELINE STREAM + INSTANT X-RAY) */}
      {isLoading ? (
        <div className="relative z-10 py-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Loading live incidents from PostgreSQL...</span>
        </div>
      ) : incidents.length === 0 ? (
        <div className="relative z-10 rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-white/60 dark:bg-[#0b0d17]/60 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            All Systems Healthy — 0 Active Crashes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Reflex is actively listening for Sentry webhooks. Once a production exception occurs, it will appear here automatically with its verified Docker patch.
          </p>
        </div>
      ) : (
        <section className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 5 COLUMNS: LIVE HEALING STREAM */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  Live Reflex Stream
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                Click to inspect
              </span>
            </div>

            <div className="space-y-3">
              {incidents.map((item) => {
                const isSelected = item.id === selectedId;
                const isResolved = isHealedStatus(item.status);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`relative overflow-hidden w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "bg-white dark:bg-[#111526] border-indigo-500/70 dark:border-indigo-500/60 shadow-[0_8px_28px_rgba(99,102,241,0.14)]"
                        : "bg-white/75 dark:bg-[#0b0d17]/75 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 opacity-85 hover:opacity-100"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-violet-500 to-sky-400" />
                    )}

                    <div className="flex items-center justify-between gap-2 pl-1">
                      <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                        {item.file_path || item.project_slug}
                        {item.line_number ? `:${item.line_number}` : ""}
                      </span>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          isResolved
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-2 pl-1 text-xs sm:text-sm font-semibold line-clamp-1 text-slate-900 dark:text-white">
                      {item.title}
                    </p>

                    <div className="mt-3 pl-1 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>{item.error_type || "Exception"}</span>
                      <span>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT 7 COLUMNS: LIVE INSTANT X-RAY STUDIO */}
          <div className="lg:col-span-7 rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-xl transition-all">
            {isDetailLoading || !selectedDetail ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <span>Loading live incident X-Ray...</span>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-semibold">
                        INCIDENT #{selectedDetail.id.slice(0, 8)}
                      </span>
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {selectedDetail.status}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                      {selectedDetail.title}
                    </h3>
                  </div>

                  {latestAttempt?.pr_url ? (
                    <a
                      href={latestAttempt.pr_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>
                        View PR {latestAttempt.pr_number ? `#${latestAttempt.pr_number}` : ""}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link
                      href={`/dashboard/incidents/${selectedDetail.id}`}
                      className="px-3.5 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 flex items-center gap-1.5"
                    >
                      <span>Full Inspector</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Live Diff or Stack Trace */}
                <div className="my-5 space-y-3 font-mono text-xs">
                  {latestAttempt?.diff ? (
                    <div className="rounded-xl bg-[#07080d] border border-emerald-500/35 p-4 text-emerald-300">
                      <div className="text-[10px] text-emerald-400 uppercase mb-2">
                        Verified Reflex Patch ({selectedDetail.file_path})
                      </div>
                      <pre className="overflow-x-auto max-h-64">
                        <code>{latestAttempt.diff}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#07080d] border border-rose-500/30 p-4 text-rose-300">
                      <div className="text-[10px] text-rose-400 uppercase mb-2">
                        Sentry Stack Trace ({selectedDetail.file_path})
                      </div>
                      <pre className="overflow-x-auto max-h-64">
                        <code>{selectedDetail.stack_trace || selectedDetail.error_message}</code>
                      </pre>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/dashboard/incidents/${selectedDetail.id}`}
                    className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Open Full X-Ray Inspector →
                  </Link>

                  <button
                    type="button"
                    onClick={handleRerunSandbox}
                    className="px-3 py-1.5 rounded-xl font-mono text-xs border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Re-run Sandbox</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* 3. LIVE QUOTA METER & IN-APP PRO UPGRADE BANNER */}
      {activePlan !== "PRO" && (
        <section className="relative z-10 rounded-3xl border p-6 sm:p-8 bg-gradient-to-r from-indigo-50 via-white to-violet-50 dark:from-indigo-950/35 dark:via-[#0b0d17] dark:to-violet-950/25 border-indigo-200 dark:border-indigo-500/35 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                  <Crown className="w-3.5 h-3.5" />
                  REFLEX PRO · $29/MO
                </span>
                {resolvedCount > 0 && (
                  <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                    You already saved ${dollarsSaved} ({roiMultiple}x ROI)
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                You have used {healsUsed} of your {maxLimit} free monthly Reflexes.
              </h3>

              <div className="space-y-2 max-w-lg">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-300">
                    Monthly Free Quota
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {usagePct}% used ({Math.max(0, maxLimit - healsUsed)} left)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400 transition-all duration-500"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                {[
                  "Unlimited autonomous Reflexes",
                  "Priority Docker sandbox runner",
                  "Instant Slack & Discord alerts",
                ].map((perk, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {perk}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4">
              <div className="lg:text-right">
                <div className="flex items-baseline lg:justify-end gap-1.5">
                  <span className="font-mono text-4xl font-extrabold text-slate-950 dark:text-white">
                    $29
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / month · Cancel anytime
                  </span>
                </div>
                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                  Unlock unlimited zero-pager protection across all repos
                </p>
              </div>

              <button
                type="button"
                onClick={openUpgradeModal}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-[0_4px_24px_rgba(99,102,241,0.35)] flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Upgrade to Pro — $29/mo</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Toast Feedback */}
      {actionToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{actionToast}</span>
        </div>
      )}
    </div>
  );
}
