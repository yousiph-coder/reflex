import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { IncidentStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return dateString;
  }
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export function getStatusBadgeConfig(status: IncidentStatus | string): {
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
  glow?: string;
} {
  const s = String(status || "").toLowerCase().trim();

  switch (s) {
    case "merged":
    case "healed":
    case "resolved":
      return {
        label: "● Healed & Merged",
        bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-700 dark:text-emerald-400",
        dot: "bg-emerald-600 dark:bg-[#05df72] shadow-[0_0_8px_rgba(5,223,114,0.6)]",
        glow: "dark:glow-emerald",
      };
    case "pr_open":
    case "pr_opened":
      return {
        label: "● PR Ready for Merge",
        bg: "bg-cyan-500/10 dark:bg-cyan-500/10",
        border: "border-cyan-500/30",
        text: "text-cyan-700 dark:text-cyan-400",
        dot: "bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]",
        glow: "dark:glow-cyan",
      };
    case "remediating":
    case "analyzing":
      return {
        label: "● Sandbox Running",
        bg: "bg-amber-500/10 dark:bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-700 dark:text-amber-400",
        dot: "bg-amber-500 dark:bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]",
        glow: "dark:glow-amber",
      };
    case "failed":
      return {
        label: "● Failed",
        bg: "bg-rose-500/10 dark:bg-rose-500/10",
        border: "border-rose-500/30",
        text: "text-rose-700 dark:text-rose-400",
        dot: "bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]",
        glow: "dark:glow-crimson",
      };
    case "awaiting_approval":
      return {
        label: "● Awaiting Approval",
        bg: "bg-amber-500/10 dark:bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-700 dark:text-amber-400",
        dot: "bg-[#f59e0b] animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]",
        glow: "dark:glow-amber",
      };
    case "rejected":
      return {
        label: "● Rejected",
        bg: "bg-zinc-100 dark:bg-white/[0.05]",
        border: "border-zinc-200 dark:border-white/10",
        text: "text-zinc-600 dark:text-zinc-400",
        dot: "bg-zinc-500",
      };
    case "ignored":
      return {
        label: "● Ignored",
        bg: "bg-zinc-100/70 dark:bg-white/[0.03]",
        border: "border-zinc-200 dark:border-white/10",
        text: "text-zinc-500 dark:text-zinc-500",
        dot: "bg-zinc-600",
      };
    case "pending":
    default:
      return {
        label: "● Pending",
        bg: "bg-zinc-100 dark:bg-white/[0.05]",
        border: "border-zinc-200 dark:border-white/10",
        text: "text-zinc-700 dark:text-zinc-300",
        dot: "bg-zinc-400",
      };
  }
}

export function getLanguageColor(language: string): string {
  const map: Record<string, string> = {
    python: "#3572A5",
    typescript: "#3178C6",
    javascript: "#F7DF1E",
    go: "#00ADD8",
    rust: "#DEA584",
    java: "#B07219",
    ruby: "#701516",
    php: "#4F5D95",
    csharp: "#178600",
    cpp: "#F34B7D",
  };
  return map[language.toLowerCase()] || "#10B981";
}

export function getRemediationModeConfig(mode: string): {
  label: string;
  shortLabel: string;
  description: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  switch (mode) {
    case "autonomous":
      return {
        label: "Autonomous (Auto-PR & Verify)",
        shortLabel: "Autonomous",
        description: "Diagnoses crash, validates fix in sandbox, and opens auto-verified pull request.",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        dot: "bg-emerald-400",
      };
    case "draft_pr":
      return {
        label: "Draft PR (Human Review)",
        shortLabel: "Draft PR",
        description: "Creates candidate patch branch and opens Draft PR awaiting SRE approval.",
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        text: "text-purple-400",
        dot: "bg-purple-400",
      };
    case "manual_approval":
      return {
        label: "Proposal Only (No Git Push)",
        shortLabel: "Proposal Only",
        description: "Executes RCA and sandbox dry-run without writing any Git branches.",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        text: "text-blue-400",
        dot: "bg-blue-400",
      };
    case "disabled":
    default:
      return {
        label: "Disabled (Telemetry Only)",
        shortLabel: "Disabled",
        description: "Exceptions are logged in explorer but no remediation agents run.",
        bg: "bg-zinc-800",
        border: "border-zinc-700/60",
        text: "text-zinc-400",
        dot: "bg-zinc-500",
      };
  }
}

