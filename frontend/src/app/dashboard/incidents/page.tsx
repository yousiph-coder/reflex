"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  FileCode,
  GitPullRequest,
  RefreshCw,
  Search,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { IncidentSummary } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const STATUSES = [
  { label: "All Incidents", value: "ALL" },
  { label: "Awaiting Review", value: "AWAITING_APPROVAL" },
  { label: "Auto-Healed", value: "RESOLVED" },
  { label: "Remediating", value: "REMEDIATING" },
  { label: "Failed", value: "FAILED" },
  { label: "Pending", value: "PENDING" },
];

function getStatusBadge(status: string) {
  const s = String(status || "").toLowerCase().trim();

  switch (s) {
    case "merged":
    case "healed":
    case "resolved":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium select-none transition-all duration-200 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#05df72] shadow-[0_0_8px_rgba(5,223,114,0.6)]" />
          ● Healed & Merged
        </span>
      );
    case "pr_open":
    case "pr_opened":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium select-none transition-all duration-200 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          ● PR Ready for Merge
        </span>
      );
    case "remediating":
    case "analyzing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium select-none transition-all duration-200 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          ● Sandbox Running
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium select-none transition-all duration-200 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          ● Failed
        </span>
      );
    case "awaiting_approval":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium select-none transition-all duration-200 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          ● Awaiting Approval
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium select-none transition-all duration-200 bg-zinc-100 dark:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          ● Pending
        </span>
      );
  }
}

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getIncidents({
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });

      // Priority sort: Ensure pending incidents with status AWAITING_APPROVAL appear at the very top
      const sorted = [...res.items].sort((a, b) => {
        if (a.status === "AWAITING_APPROVAL" && b.status !== "AWAITING_APPROVAL") return -1;
        if (b.status === "AWAITING_APPROVAL" && a.status !== "AWAITING_APPROVAL") return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setIncidents(sorted);
    } catch (err) {
      console.error("Failed to load incidents from backend API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter]);

  // Filter incidents
  const filteredIncidents = incidents.filter((i) => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      i.title.toLowerCase().includes(term) ||
      i.error_type.toLowerCase().includes(term) ||
      (i.file_path && i.file_path.toLowerCase().includes(term)) ||
      i.sentry_issue_id.toLowerCase().includes(term)
    );
  });

  const awaitingCount = incidents.filter((i) => i.status === "AWAITING_APPROVAL").length;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2.5 font-mono">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            Incident Feed & Explorer
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 font-sans leading-relaxed">
            Real-time feed of intercepted production exceptions and autonomous remediation PR audits.
          </p>
        </div>

        <button
          type="button"
          onClick={loadIncidents}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/10 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all select-none"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-emerald-500 dark:text-emerald-400")} />
          Refresh Feed
        </button>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exceptions, files, or issue IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 transition-colors font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono">
          {STATUSES.map((st) => (
            <button
              type="button"
              key={st.value}
              onClick={() => setStatusFilter(st.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === st.value
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm font-semibold"
                  : "liquid-glass border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>{st.label}</span>
              {st.value === "AWAITING_APPROVAL" && awaitingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                  {awaitingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Data Table (Apple Liquid Glass) ───────────────────────── */}
      <div className="rounded-2xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 overflow-hidden shadow-2xl transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/70 dark:bg-black/60 text-zinc-500 border-b border-zinc-200 dark:border-white/10 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Error & Exception</th>
                <th className="py-3.5 px-4 font-semibold">Source Location</th>
                <th className="py-3.5 px-4 font-semibold">Environment</th>
                <th className="py-3.5 px-4 font-semibold">Detected</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-zinc-500 font-mono text-xs">
                    No incidents match the active filters.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => router.push(`/dashboard/incidents/${incident.id}`)}
                    className="hover:bg-zinc-100/60 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(incident.status)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-mono">
                          {incident.error_type}
                        </span>
                        {incident.pr_url && (
                          <a
                            href={incident.pr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                            title={incident.pr_url}
                          >
                            <GitPullRequest className="w-2.5 h-2.5" />
                            <span>PR #{incident.pr_url.split("/").pop()}</span>
                            <ExternalLink className="w-2 h-2" />
                          </a>
                        )}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 truncate max-w-sm text-[11px] mt-0.5 font-sans leading-relaxed">
                        {incident.title}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5" title={incident.file_path || ""}>
                        <FileCode className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {incident.file_path ? incident.file_path.split("/").slice(-2).join("/") : "—"}
                          {incident.line_number ? `:${incident.line_number}` : ""}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[10px] uppercase font-mono text-zinc-600 dark:text-zinc-400">
                        {incident.environment || "production"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                      {formatRelativeTime(incident.created_at)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/dashboard/incidents/${incident.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-zinc-200 dark:border-white/10 hover:border-emerald-500/30 text-xs font-mono font-medium transition-all group-hover:border-emerald-500/30"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
