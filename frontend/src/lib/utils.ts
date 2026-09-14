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

export function getStatusBadgeConfig(status: IncidentStatus): {
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "RESOLVED":
      return {
        label: "Auto-Healed",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        dot: "bg-emerald-400",
      };
    case "REMEDIATING":
      return {
        label: "Remediating",
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        text: "text-purple-400",
        dot: "bg-purple-400 animate-pulse",
      };
    case "ANALYZING":
      return {
        label: "Analyzing",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        text: "text-blue-400",
        dot: "bg-blue-400 animate-pulse",
      };
    case "FAILED":
      return {
        label: "Failed",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        text: "text-rose-400",
        dot: "bg-rose-400",
      };
    case "PENDING":
    default:
      return {
        label: "Pending",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-400",
        dot: "bg-amber-400",
      };
  }
}
