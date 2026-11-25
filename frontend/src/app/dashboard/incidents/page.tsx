"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  FileCode2,
  HeartPulse,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { IncidentSummary } from "@/lib/types";

export default function ReflexIncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | "resolved" | "open">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const fetchLiveIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getIncidents({ pageSize: 50 });
      setIncidents(res?.items || []);
    } catch {
      setIncidents([]);
      showToast("Could not load incidents. Check FastAPI backend connection.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLiveIncidents();
  }, [fetchLiveIncidents]);

  const handleRerun = async (incidentId: string) => {
    try {
      showToast(`Re-running Docker Sandbox for #${incidentId.slice(0, 8)}...`);
      await apiClient.rerunSandbox(incidentId);
      showToast("Sandbox verification completed!");
      fetchLiveIncidents();
    } catch {
      showToast("Failed to trigger sandbox verification.");
    }
  };

  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;
  const openCount = incidents.filter(
    (i) => i.status !== "RESOLVED" && i.status !== "REJECTED"
  ).length;

  const filteredIncidents = incidents.filter((inc) => {
    const matchesTab =
      filter === "all"
        ? true
        : filter === "resolved"
        ? inc.status === "RESOLVED"
        : inc.status !== "RESOLVED" && inc.status !== "REJECTED";

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (inc.title || "").toLowerCase().includes(q) ||
      (inc.file_path || "").toLowerCase().includes(q) ||
      (inc.error_type || "").toLowerCase().includes(q) ||
      (inc.id || "").toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-14">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[960px] h-[420px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live PostgreSQL Incident Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Incident Explorer
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          <div className="px-3.5 py-2 rounded-xl border bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400">Resolved:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">
              {resolvedCount}
            </strong>
          </div>

          <div className="px-3.5 py-2 rounded-xl border bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-500 dark:text-slate-400">Open:</span>
            <strong className="text-indigo-600 dark:text-indigo-400">
              {openCount}
            </strong>
          </div>

          <button
            type="button"
            onClick={fetchLiveIncidents}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0b0d17]/90 hover:border-indigo-500/40 text-slate-600 dark:text-slate-300 transition-all"
            title="Refresh live incidents"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-2xl border bg-slate-100/80 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 self-start">
          {[
            { key: "all", label: `All (${incidents.length})` },
            { key: "resolved", label: `Resolved (${resolvedCount})` },
            { key: "open", label: `Open (${openCount})` },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key as "all" | "resolved" | "open")}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by file, error, or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-mono bg-white/90 dark:bg-[#0b0d17]/90 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="relative z-10 py-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Loading live incidents from Reflex backend...</span>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="relative z-10 rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-white/60 dark:bg-[#0b0d17]/60 p-12 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            No matching incidents found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Production exceptions captured via Sentry webhooks will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="relative z-10 space-y-4">
          {filteredIncidents.map((inc) => {
            const isResolved = inc.status === "RESOLVED";
            return (
              <div
                key={inc.id}
                className="rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 hover:border-indigo-500/40 shadow-sm transition-all space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-semibold">
                        #{inc.id.slice(0, 8)}
                      </span>

                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                        <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                        {inc.file_path || inc.project_slug}
                        {inc.line_number ? `:${inc.line_number}` : ""}
                      </span>

                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {new Date(inc.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                      {inc.title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <span
                      className={`font-mono text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                        isResolved
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {inc.status}
                    </span>

                    <Link
                      href={`/dashboard/incidents/${inc.id}`}
                      className="px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shadow-[0_4px_15px_rgba(99,102,241,0.3)]"
                    >
                      <span>Inspect X-Ray</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                  {inc.error_type}: {inc.error_message}
                </p>

                <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400">
                    <span>
                      Repo:{" "}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {inc.project_slug}
                      </strong>
                    </span>
                    <span>
                      Env:{" "}
                      <strong className="text-sky-600 dark:text-sky-400">
                        {inc.environment || "production"}
                      </strong>
                    </span>
                    <span>
                      Platform:{" "}
                      <strong className="text-violet-600 dark:text-violet-400">
                        {inc.platform || "auto"}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRerun(inc.id)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Re-verify</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
