"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Cpu,
  FolderGit2,
  GitBranch,
  Globe,
  Lock,
  Radio,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { CreateRepoPayload, RemediationMode, Repository } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newRepo: Repository) => void;
}

export function ConnectRepoModal({ isOpen, onClose, onCreated }: ConnectRepoModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: GitHub form fields
  const [owner, setOwner] = useState("yousiph-coder");
  const [name, setName] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [language, setLanguage] = useState("Python");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [rootDirectory, setRootDirectory] = useState("/");
  const [description, setDescription] = useState("");

  // Step 2: Sentry mapping fields
  const [sentryOrg, setSentryOrg] = useState("yousiph-sre");
  const [sentryProject, setSentryProject] = useState("");
  const [sentryEnvironment, setSentryEnvironment] = useState("production");
  const [isTestingSentry, setIsTestingSentry] = useState(false);
  const [sentryTestResult, setSentryTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Step 3: AutoHeal policy fields
  const [remediationMode, setRemediationMode] = useState<RemediationMode>("autonomous");
  const [sandboxTestCmd, setSandboxTestCmd] = useState("pytest -v tests/");
  const [llmModel, setLlmModel] = useState("gpt-4o");

  if (!isOpen) return null;

  // Auto-fill Sentry project if left empty
  const handleNameChange = (val: string) => {
    setName(val);
    if (!sentryProject) {
      setSentryProject(val.toLowerCase().replace(/[^a-z0-9_-]/g, "-"));
    }
  };

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    if (val === "Python") setSandboxTestCmd("pytest -v tests/");
    else if (val === "TypeScript" || val === "JavaScript") setSandboxTestCmd("npm test");
    else if (val === "Go") setSandboxTestCmd("go test ./...");
    else if (val === "Rust") setSandboxTestCmd("cargo test");
    else if (val === "Java") setSandboxTestCmd("./gradlew test");
  };

  const handleTestSentry = async () => {
    if (!sentryOrg.trim() || !sentryProject.trim()) {
      setSentryTestResult({
        success: false,
        message: "Please enter both Sentry Organization and Project Slug.",
      });
      return;
    }

    setIsTestingSentry(true);
    setSentryTestResult(null);
    try {
      const res = await apiClient.testSentryConnection(sentryOrg.trim(), sentryProject.trim());
      setSentryTestResult(res);
    } catch {
      setSentryTestResult({
        success: false,
        message: "Unable to verify Sentry project. Please check credentials.",
      });
    } finally {
      setIsTestingSentry(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim() || !name.trim()) {
      setError("Repository Owner and Name are required.");
      setStep(1);
      return;
    }
    if (!sentryOrg.trim() || !sentryProject.trim()) {
      setError("Sentry Organization and Project Slug are required.");
      setStep(2);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const payload: CreateRepoPayload = {
        owner: owner.trim(),
        name: name.trim(),
        default_branch: defaultBranch.trim() || "main",
        language,
        visibility,
        root_directory: rootDirectory.trim() || "/",
        description: description.trim() || `AutoHeal monitored repository ${owner}/${name}`,
        sentry_organization_slug: sentryOrg.trim(),
        sentry_project_slug: sentryProject.trim(),
        sentry_environment: sentryEnvironment,
        remediation_mode: remediationMode,
        sandbox_test_cmd: sandboxTestCmd.trim() || "npm test",
        llm_model: llmModel,
      };

      const created = await apiClient.createRepository(payload);
      onCreated(created);
      handleResetAndClose();
    } catch (err: any) {
      setError(err?.message || "Failed to connect repository. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setStep(1);
    setName("");
    setDescription("");
    setSentryProject("");
    setSentryTestResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ── Modal Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-glow-emerald">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-mono text-zinc-900 dark:text-white">
                Connect Repository & Sentry
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Setup autonomous closed-loop AI error remediation for your codebase.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step Indicator Bar ───────────────────────────────────── */}
        <div className="grid grid-cols-3 border-b border-zinc-200 dark:border-white/10 bg-zinc-100/60 dark:bg-black/40 text-xs font-mono">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={cn(
              "py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors border-b-2",
              step === 1
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                step === 1
                  ? "bg-emerald-500 text-black shadow-glow-emerald"
                  : "bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
              )}
            >
              1
            </span>
            <span className="truncate">GitHub Repo</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={cn(
              "py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors border-b-2",
              step === 2
                ? "border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                step === 2
                  ? "bg-purple-500 text-white"
                  : "bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
              )}
            >
              2
            </span>
            <span className="truncate">Sentry Project</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={cn(
              "py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors border-b-2",
              step === 3
                ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                step === 3
                  ? "bg-blue-500 text-white"
                  : "bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
              )}
            >
              3
            </span>
            <span className="truncate">AI Policy</span>
          </button>
        </div>

        {/* ── Form Body ────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ══════════ STEP 1: GITHUB DETAILS ══════════ */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    GitHub Owner / Org <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. yousiph-coder"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    Repository Name <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. payment-service"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    Default Branch
                  </label>
                  <input
                    type="text"
                    value={defaultBranch}
                    onChange={(e) => setDefaultBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    Primary Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/80 transition-colors"
                  >
                    <option value="Python">Python</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="Go">Go</option>
                    <option value="Rust">Rust</option>
                    <option value="Java">Java</option>
                    <option value="Ruby">Ruby</option>
                    <option value="PHP">PHP</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/80 transition-colors"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                  Subdirectory / Monorepo Root <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={rootDirectory}
                  onChange={(e) => setRootDirectory(e.target.value)}
                  placeholder="/"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 font-mono transition-colors"
                />
                <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                  Leave as <code className="text-emerald-500 dark:text-emerald-400">/</code> if the repository root contains the project.
                </p>
              </div>

              <div>
                <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5">
                  Description <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Core authentication and user management API"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 transition-colors"
                />
              </div>
            </div>
          )}

          {/* ══════════ STEP 2: SENTRY MAPPING ══════════ */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-700 dark:text-purple-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 font-mono">
                  <Radio className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                  Map Sentry Issue Stream to Repository
                </div>
                <p className="text-purple-600/90 dark:text-purple-300/80 text-[11px]">
                  When an exception is logged in Sentry with this project slug, AutoHeal intercepts the stack trace, checks out the matching file in this GitHub repo, and runs autonomous diagnosis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    Sentry Organization Slug <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sentryOrg}
                    onChange={(e) => setSentryOrg(e.target.value)}
                    placeholder="e.g. yousiph-sre"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    Sentry Project Slug <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sentryProject}
                    onChange={(e) => setSentryProject(e.target.value)}
                    placeholder="e.g. payment-service-api"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                  Target Environment Filter
                </label>
                <select
                  value={sentryEnvironment}
                  onChange={(e) => setSentryEnvironment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500/80 transition-colors"
                >
                  <option value="production">Production Only (Recommended)</option>
                  <option value="staging">Staging & Production</option>
                  <option value="all">All Environments (*)</option>
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Filters which incoming Sentry alerts trigger autonomous remediation pull requests.
                </p>
              </div>

              {/* Verify Sentry Connection Button & Result */}
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestSentry}
                    disabled={isTestingSentry || !sentryOrg || !sentryProject}
                    className="px-3.5 py-2 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 hover:border-purple-500/40 text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Radio className={cn("w-3.5 h-3.5", isTestingSentry ? "animate-spin text-purple-400" : "")} />
                    {isTestingSentry ? "Verifying..." : "Verify Sentry Project"}
                  </button>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Tests Sentry REST API & webhook listener ping
                  </span>
                </div>

                {sentryTestResult && (
                  <div
                    className={cn(
                      "mt-3 p-3 rounded-xl border text-xs flex items-center gap-2 font-mono",
                      sentryTestResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300"
                    )}
                  >
                    {sentryTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    )}
                    <span>{sentryTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ STEP 3: AUTOHEAL REMEDIATION POLICY ══════════ */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                  Remediation Automation Level
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "autonomous" as RemediationMode,
                      title: "Autonomous (Recommended)",
                      desc: "Full pipeline: Agent generates patch, validates in sandbox runner, and opens Pull Request.",
                    },
                    {
                      id: "draft_pr" as RemediationMode,
                      title: "Draft PR (Human Review)",
                      desc: "Agent opens a Draft PR with RCA description and diff, requiring manual SRE approval.",
                    },
                    {
                      id: "manual_approval" as RemediationMode,
                      title: "Proposal Only",
                      desc: "Only stores the diagnosis and suggested diff in Incident Feed; does not push any Git branches.",
                    },
                    {
                      id: "disabled" as RemediationMode,
                      title: "Disabled",
                      desc: "Collects telemetry only without invoking AI agents.",
                    },
                  ].map((item) => (
                    <label
                      key={item.id}
                      onClick={() => setRemediationMode(item.id)}
                      className={cn(
                        "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                        remediationMode === item.id
                          ? "bg-emerald-500/10 border-emerald-500/40 text-zinc-900 dark:text-white shadow-glow-emerald"
                          : "bg-zinc-100/50 dark:bg-black/40 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-white/5"
                      )}
                    >
                      <input
                        type="radio"
                        name="remediationMode"
                        checked={remediationMode === item.id}
                        onChange={() => setRemediationMode(item.id)}
                        className="mt-1 text-emerald-500 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-semibold font-mono">{item.title}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    LLM Engine Model
                  </label>
                  <select
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/80 transition-colors font-mono"
                  >
                    <option value="gpt-4o">gpt-4o (Default, High Accuracy)</option>
                    <option value="claude-3-5-sonnet">claude-3-5-sonnet (Advanced Reasoning)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (Long Context)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5 font-mono">
                    Sandbox Verification Command
                  </label>
                  <input
                    type="text"
                    value={sandboxTestCmd}
                    onChange={(e) => setSandboxTestCmd(e.target.value)}
                    placeholder="pytest -v tests/"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 font-mono transition-colors"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                    Executed inside isolated sandbox before PR is opened.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal Footer Buttons ─────────────────────────────────── */}
          <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-mono font-medium transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-3.5 py-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs font-mono font-medium transition-colors"
              >
                Cancel
              </button>
            )}

            <div className="flex items-center gap-2">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && (!owner.trim() || !name.trim())) {
                      setError("Please provide both Owner and Repository Name.");
                      return;
                    }
                    if (step === 2 && (!sentryOrg.trim() || !sentryProject.trim())) {
                      setError("Please provide Sentry Organization and Project Slug.");
                      return;
                    }
                    setError(null);
                    setStep((s) => (s + 1) as 1 | 2 | 3);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all font-mono"
                >
                  Next Step
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all disabled:opacity-50 font-mono"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isSubmitting ? "Connecting..." : "Finish & Connect"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
