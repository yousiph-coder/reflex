"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Command,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { UserNavMenu } from "./UserNavMenu";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPalette } from "./CommandPalette";

export function TopNav() {
  const { currentOrg, billingUsage, openUpgradeModal } = useTenant();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toLowerCase();
  const isPro = activePlan === "pro";
  const isEnterprise = activePlan === "enterprise";

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#07080d]/85 backdrop-blur-2xl flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20 transition-colors duration-200">
        {/* ── Left: Search & Command Palette Trigger ──────────────── */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] text-xs text-slate-500 dark:text-slate-400 cursor-pointer transition-all w-60 sm:w-72 md:w-80 group text-left select-none"
            aria-label="Open command palette"
          >
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0" />
            <span className="flex-1 truncate font-sans text-xs">Search or type a command...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-white/10">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* ── Center / Right: Reflex Agent & System Status Bar ────── */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Agent & System Status Telemetry Capsule */}
          <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-mono shadow-sm">
            {/* Reflex Engine Indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">Reflex Engine:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide">
                ACTIVE <span className="text-slate-400 dark:text-slate-500 font-normal">(GPT-4o)</span>
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            {/* API Connection Indicator */}
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span>API: <strong className="text-slate-900 dark:text-white font-semibold">CONNECTED</strong></span>
            </div>

            <span className="hidden xl:inline text-slate-300 dark:text-slate-700">|</span>

            {/* Ephemeral Sandbox Runner */}
            <div className="hidden xl:flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Boxes className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span>SANDBOX: <strong className="text-sky-600 dark:text-sky-400 font-medium">ISOLATED</strong></span>
            </div>
          </div>

          {/* Plan Badge or Upgrade CTA */}
          {isEnterprise ? (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-600 dark:text-violet-400 text-xs font-semibold tracking-wide font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enterprise Dedicated</span>
            </div>
          ) : isPro ? (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRO Unlimited</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={openUpgradeModal}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all font-mono"
            >
              <Zap className="w-3 h-3" />
              <span>Upgrade ($29/mo)</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

          {/* Theme Toggle Button (Dark / Light) */}
          <ThemeToggle />

          {/* User Profile Avatar & Menu */}
          <UserNavMenu />
        </div>
      </header>

      {/* Interactive Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}