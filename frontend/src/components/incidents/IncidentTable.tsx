"use client";

import { useState } from "react";
import {
  ArrowUpDown,
  ChevronRight,
  ExternalLink,
  FileCode,
  Filter,
  Search,
} from "lucide-react";
import { IncidentStatus, IncidentSummary } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface IncidentTableProps {
  incidents: IncidentSummary[];
  onSelectIncident: (id: string) => void;
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
  const STATUSES = [
    { label: "All Incidents", value: "ALL" },
    { label: "Auto-Healed", value: "RESOLVED" },
    { label: "Remediating", value: "REMEDIATING" },
    { label: "Failed", value: "FAILED" },
    { label: "Pending", value: "PENDING" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Search & Filter Controls ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exceptions, files, or issue IDs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUSES.map((st) => (
            <button
              key={st.value}
              onClick={() => onStatusChange(st.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedStatus === st.value
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Data Table ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-medium">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Error & Exception</th>
                <th className="py-3 px-4">Source Location</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Detected</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No incidents match the active filters.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => onSelectIncident(incident.id)}
                    className="hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={incident.status} />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {incident.error_type}
                      </div>
                      <div className="text-zinc-400 truncate max-w-sm text-[11px] mt-0.5">
                        {incident.title}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5" title={incident.file_path || ""}>
                        <FileCode className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {incident.file_path ? incident.file_path.split("/").slice(-2).join("/") : "—"}
                          {incident.line_number ? `:${incident.line_number}` : ""}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/40 text-[10px] uppercase font-mono text-zinc-400">
                        {incident.environment || "production"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                      {formatRelativeTime(incident.created_at)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-zinc-400 group-hover:text-emerald-400 text-xs font-medium">
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
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
