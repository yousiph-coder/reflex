"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Filter, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { IncidentDetail, IncidentSummary } from "@/lib/types";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import { IncidentTable } from "@/components/incidents/IncidentTable";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getIncidents({
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setIncidents(res.items);
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter]);

  const handleSelectIncident = async (id: string) => {
    try {
      const detail = await apiClient.getIncident(id);
      setSelectedIncident(detail);
    } catch (err) {
      console.error("Failed to fetch incident detail:", err);
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      i.title.toLowerCase().includes(term) ||
      i.error_type.toLowerCase().includes(term) ||
      (i.file_path && i.file_path.toLowerCase().includes(term)) ||
      i.sentry_issue_id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Incident Feed & Explorer
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time feed of intercepted production exceptions and autonomous remediation PR audits.
          </p>
        </div>

        <button
          onClick={loadIncidents}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          Refresh Feed
        </button>
      </div>

      {/* ── Filterable Table ─────────────────────────────────────── */}
      <IncidentTable
        incidents={filteredIncidents}
        onSelectIncident={handleSelectIncident}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* ── Slide-Over Detail Drawer ─────────────────────────────── */}
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />
    </div>
  );
}
