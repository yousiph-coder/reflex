"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  Cpu,
  FolderGit2,
  GitBranch,
  Plus,
  Radio,
  Settings2,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import {
  RemediationMode,
  Repository,
  SentryProjectMapping,
  UpdateRepoPayload,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface EditMappingModalProps {
  repo: Repository | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedRepo: Repository) => void;
}

export function EditMappingModal({
  repo,
  isOpen,
  onClose,
  onSaved,
}: EditMappingModalProps) {
  if (!isOpen || !repo) return null;

  const [defaultBranch, setDefaultBranch] = useState(repo.default_branch);
  const [rootDirectory, setRootDirectory] = useState(repo.root_directory || "/");
  const [remediationMode, setRemediationMode] = useState<RemediationMode>(repo.remediation_mode);
  const [llmModel, setLlmModel] = useState(repo.llm_model);
  const [sandboxTestCmd, setSandboxTestCmd] = useState(repo.sandbox_test_cmd);
  const [mappings, setMappings] = useState<SentryProjectMapping[]>(repo.sentry_mappings || []);

  // New mapping inline form state
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newOrgSlug, setNewOrgSlug] = useState(repo.sentry_mappings?.[0]?.organization_slug || "yousiph-sre");
  const [newProjectSlug, setNewProjectSlug] = useState("");
  const [newEnv, setNewEnv] = useState("production");
  const [newPrefix, setNewPrefix] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMapping = () => {
    if (!newOrgSlug.trim() || !newProjectSlug.trim()) {
      return;
    }
    const newMap: SentryProjectMapping = {
      id: `map-${Date.now()}`,
      organization_slug: newOrgSlug.trim(),
      project_slug: newProjectSlug.trim(),
      environment: newEnv,
      path_prefix: newPrefix.trim() || undefined,
      is_active: true,
      last_event_at: null,
    };
    setMappings([...mappings, newMap]);
    setNewProjectSlug("");
    setNewPrefix("");
    setShowAddMapping(false);
  };

  const handleRemoveMapping = (mapId: string) => {
    setMappings(mappings.filter((m) => m.id !== mapId));
  };

  const handleToggleMappingActive = (mapId: string) => {
    setMappings(
      mappings.map((m) => (m.id === mapId ? { ...m, is_active: !m.is_active } : m))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: UpdateRepoPayload = {
        default_branch: defaultBranch.trim() || "main",
        root_directory: rootDirectory.trim() || "/",
        remediation_mode: remediationMode,
        llm_model: llmModel,
        sandbox_test_cmd: sandboxTestCmd.trim() || "npm test",
        sentry_mappings: mappings,
      };

      const updated = await apiClient.updateRepository(repo.id, payload);
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ── Modal Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-mono text-zinc-900 dark:text-white">
                Edit {repo.full_name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Branch: {defaultBranch} • {mappings.length} Sentry Project(s) Mapped
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Form Body ────────────────────────────────────────────── */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sentry Project Mappings Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold font-mono text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                Linked Sentry Projects & Routing
              </label>

              {!showAddMapping && (
                <button
                  type="button"
                  onClick={() => setShowAddMapping(true)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1 font-mono font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Map Another Project
                </button>
              )}
            </div>

            <div className="space-y-2">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="p-3.5 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleMappingActive(mapping.id)}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all",
                        mapping.is_active
                          ? "bg-emerald-500 shadow-glow-emerald"
                          : "bg-zinc-400 dark:bg-zinc-600"
                      )}
                      title={mapping.is_active ? "Click to disable" : "Click to enable"}
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-zinc-900 dark:text-white truncate font-medium">
                        <span className="text-zinc-400 dark:text-zinc-500">{mapping.organization_slug}/</span>
                        <span className="text-purple-600 dark:text-purple-300">{mapping.project_slug}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                        <span className="uppercase font-semibold">{mapping.environment}</span>
                        {mapping.path_prefix && <span>• path: {mapping.path_prefix}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-medium border",
                        mapping.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-glow-emerald"
                          : "bg-zinc-100 dark:bg-white/5 text-zinc-500 border-zinc-300 dark:border-white/10"
                      )}
                    >
                      {mapping.is_active ? "Active" : "Paused"}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(mapping.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove this Sentry mapping"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {mappings.length === 0 && !showAddMapping && (
                <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-white/10 text-center text-xs text-zinc-500 font-mono">
                  No Sentry projects mapped to this repo yet.
                </div>
              )}
            </div>

            {/* Add new mapping drawer */}
            {showAddMapping && (
              <div className="p-4 rounded-xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/30 space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-semibold font-mono text-purple-700 dark:text-purple-300">
                  Add Sentry Project Mapping
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1 font-mono">Org Slug</label>
                    <input
                      type="text"
                      value={newOrgSlug}
                      onChange={(e) => setNewOrgSlug(e.target.value)}
                      placeholder="yousiph-sre"
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-purple-500/80 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1 font-mono">Project Slug</label>
                    <input
                      type="text"
                      value={newProjectSlug}
                      onChange={(e) => setNewProjectSlug(e.target.value)}
                      placeholder="e.g. auth-service"
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-purple-500/80 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1 font-mono">Environment</label>
                    <select
                      value={newEnv}
                      onChange={(e) => setNewEnv(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500/80 transition-colors font-mono"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400 block mb-1 font-mono">Path Prefix</label>
                    <input
                      type="text"
                      value={newPrefix}
                      onChange={(e) => setNewPrefix(e.target.value)}
                      placeholder="e.g. src/auth/"
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-purple-500/80 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 font-mono">
                  <button
                    type="button"
                    onClick={() => setShowAddMapping(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMapping}
                    disabled={!newOrgSlug.trim() || !newProjectSlug.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    Add Mapping
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GitHub Branch & Monorepo Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                Default Target Branch
              </label>
              <input
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500/80 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                Root Directory (Monorepo)
              </label>
              <input
                type="text"
                value={rootDirectory}
                onChange={(e) => setRootDirectory(e.target.value)}
                placeholder="/"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500/80 transition-colors"
              />
            </div>
          </div>

          {/* Remediation Mode Selector */}
          <div>
            <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
              Remediation Policy
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              {(
                [
                  { id: "autonomous", label: "Autonomous", desc: "Auto-PR + Merge" },
                  { id: "draft_pr", label: "Draft PR", desc: "Human Review" },
                  { id: "manual_approval", label: "Proposal", desc: "RCA Only" },
                  { id: "disabled", label: "Disabled", desc: "Telemetry Only" },
                ] as const
              ).map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setRemediationMode(m.id)}
                  className={cn(
                    "p-2.5 rounded-xl border text-left text-xs transition-all",
                    remediationMode === m.id
                      ? "bg-emerald-500/10 border-emerald-500/40 text-zinc-900 dark:text-white shadow-glow-emerald"
                      : "bg-zinc-100/50 dark:bg-black/40 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-white/5"
                  )}
                >
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">{m.label}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Model & Test Command */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 flex items-center gap-1.5 font-mono">
                <Cpu className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                AI Model Identifier
              </label>
              <select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/80 transition-colors font-mono"
              >
                <option value="gpt-4o">gpt-4o</option>
                <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                Sandbox Verification Command
              </label>
              <input
                type="text"
                value={sandboxTestCmd}
                onChange={(e) => setSandboxTestCmd(e.target.value)}
                placeholder="pytest -v tests/"
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500/80 transition-colors"
              />
            </div>
          </div>

          {/* ── Modal Footer ─────────────────────────────────────────── */}
          <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex items-center justify-end gap-2.5 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
