"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  FileCode,
  GitPullRequest,
  Search,
} from "lucide-react";
import { IncidentSummary } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface IncidentTableProps {
  incidents: IncidentSummary[];
  onSelectIncident?: (id: string) => void;
  selectedStatus?: string;
  onStatusChange: (status: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function IncidentTable({
  incidents,
  onSelectIncident,
  selectedStatus = "ALL",
  onStatusChange,
  searchTerm,
  onSearchChange,
}: IncidentTableProps) {
  const router = useRouter();

  const STATUSES = [
    { label: "All Incidents", value: "ALL" },
    { label: "Awaiting Review", value: "AWAITING_APPROVAL" },
    { label: "Auto-Healed", value: "RESOLVED" },
    { label: "Remediating", value: "REMEDIATING" },
    { label: "Failed", value: "FAILED" },
    { label: "Pending", value: "PENDING" },
  ];

  const awaitingCount = incidents.filter((i) => i.status === "AWAITING_APPROVAL").length;

  const handleRowClick = (id: string) => {
    if (onSelectIncident) {
      onSelectIncident(id);
    } else {
      router.push(`/dashboard/incidents/${id}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Search & Filter Controls ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exceptions, files, or issue IDs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 transition-colors font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono">
          {STATUSES.map((st) => (
            <button
              type="button"
              key={st.value}
              onClick={() => onStatusChange(st.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedStatus === st.value
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
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-zinc-500 font-mono text-xs">
                    No incidents match the active filters.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => handleRowClick(incident.id)}
                    className="hover:bg-zinc-100/60 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={incident.status} />
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
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
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
