"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  GitPullRequest,
  KeyRound,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Incident Explorer",
    href: "/dashboard/incidents",
    icon: AlertTriangle,
  },
  {
    label: "API Keys & Setup",
    href: "/dashboard/settings",
    icon: KeyRound,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-800/80 bg-[#0c0c0e] flex flex-col justify-between select-none">
      {/* ── Brand Header ────────────────────────────────────────── */}
      <div>
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              AutoHeal AI
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">Autonomous SRE</p>
          </div>
        </div>

        {/* ── Navigation Links ──────────────────────────────────── */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/50"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-emerald-400" : "text-zinc-400"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Agent Engine Status Widget ─────────────────────────── */}
      <div className="p-4 m-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Agent Engine
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
            ONLINE
          </span>
        </div>

        <div className="space-y-1 text-[11px] text-zinc-400 font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-500">Target Repo</span>
            <span className="text-zinc-300 truncate max-w-[110px]" title="yousiph-coder/autoheal-target-demo">
              autoheal-demo
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">LLM Model</span>
            <span className="text-zinc-300">gpt-4o</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Sandbox</span>
            <span className="text-zinc-300">Docker Subproc</span>
          </div>
        </div>

        <a
          href="https://github.com/yousiph-coder/autoheal-target-demo"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg border border-zinc-700/40 transition-colors"
        >
          <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
          View Target Repo
          <ExternalLink className="w-3 h-3 text-zinc-500" />
        </a>
      </div>
    </aside>
  );
}
