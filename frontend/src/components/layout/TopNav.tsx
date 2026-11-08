"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Boxes,
  Command,
  Cpu,
  Globe,
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
  const healsUsed = billingUsage?.heals_used ?? 0;
  const maxLimit = billingUsage?.limit ?? 5;

  return (
    <>
      <header className="h-16 border-b border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-2xl flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20 transition-colors duration-200">
        {/* ── Left: Search & Command Palette Trigger ──────────────── */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10 hover:border-emerald-500/50 hover:shadow-glow-emerald text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer transition-all w-60 sm:w-72 md:w-80 group text-left select-none"
            aria-label="Open command palette"
          >
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors flex-shrink-0" />
            <span className="flex-1 truncate font-sans text-xs">Search or type a command...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-white/10">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* ── Center / Right: Merged Agent & System Status Bar ────── */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Agent & System Status Telemetry Capsule */}
          <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full liquid-glass border border-zinc-200 dark:border-white/10 text-xs font-mono shadow-sm">
            {/* Agent Engine Indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-glow-emerald"></span>
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">Agent Engine:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold tracking-wide">
                ACTIVE <span className="text-zinc-400 dark:text-zinc-500 font-normal">(GPT-4o)</span>
              </span>
            </div>

            <span className="text-zinc-300 dark:text-zinc-700">|</span>

            {/* API Connection Indicator */}
            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span>API: <strong className="text-zinc-900 dark:text-white font-semibold">CONNECTED</strong></span>
            </div>

            <span className="hidden xl:inline text-zinc-300 dark:text-zinc-700">|</span>

            {/* Ephemeral Sandbox Runner */}
            <div className="hidden xl:flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <Boxes className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
              <span>SANDBOX: <strong className="text-cyan-600 dark:text-cyan-400 font-medium">ISOLATED</strong></span>
            </div>
          </div>

          {/* Plan Badge or Upgrade CTA */}
          {isEnterprise ? (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-semibold tracking-wide font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enterprise Dedicated</span>
            </div>
          ) : isPro ? (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide shadow-glow-emerald font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRO Unlimited</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={openUpgradeModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-black bg-emerald-500 hover:bg-emerald-400 shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all font-mono"
            >
              <Zap className="w-3 h-3 text-black fill-black" />
              <span>Upgrade ($29/mo)</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-200 dark:border-white/10 dark:bg-white/10 hidden sm:block" />

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
