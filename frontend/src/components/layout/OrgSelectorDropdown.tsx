"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronDown,
  Layers,
  Settings,
  Sparkles,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";

export function OrgSelectorDropdown() {
  const { currentOrg, organizations, switchOrganization, billingUsage } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Derived strictly from backend tenant plan
  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toLowerCase();

  const renderPlanBadge = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "enterprise":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Enterprise
          </span>
        );
      case "pro":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 glow-emerald">
            Pro
          </span>
        );
      case "free":
      case "starter":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 text-zinc-400 dark:text-zinc-400 light:text-zinc-600 border border-white/10 dark:border-white/10 light:border-zinc-200">
            Free
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Organization Dropdown Trigger with Read-Only Plan Badge ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100/90 hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-zinc-200 border border-white/10 dark:border-white/10 light:border-zinc-200 transition-all text-xs group select-none backdrop-blur-xl"
        aria-expanded={isOpen}
        aria-label="Switch organization"
      >
        <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 glow-emerald">
          <Layers className="w-3.5 h-3.5" />
        </div>

        <span className="font-semibold text-zinc-200 dark:text-zinc-200 light:text-zinc-800 group-hover:text-white dark:group-hover:text-white light:group-hover:text-zinc-950 transition-colors truncate max-w-[140px] font-sans">
          {currentOrg?.name || "AutoHeal Organization"}
        </span>

        {/* Read-Only Plan Badge */}
        {renderPlanBadge(activePlan)}

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 dark:text-zinc-500 light:text-zinc-400 group-hover:text-zinc-300 dark:group-hover:text-zinc-300 light:group-hover:text-zinc-700 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-400" : ""
          }`}
        />
      </button>

      {/* ── Dropdown Menu (Apple Liquid Glass Elevated) ──────────── */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl liquid-glass-elevated z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-white/10 dark:border-white/10 light:border-zinc-200 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-400 light:text-zinc-500 uppercase tracking-wider font-mono">
              Workspaces
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-zinc-400 font-mono">
              {organizations.length} Available
            </span>
          </div>

          <div className="p-1.5 space-y-1 max-h-64 overflow-y-auto">
            {organizations.map((org) => {
              const isSelected = org.id === currentOrg?.id;

              return (
                <button
                  type="button"
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors text-xs ${
                    isSelected
                      ? "bg-white/[0.08] dark:bg-white/[0.08] light:bg-zinc-200/80 text-white dark:text-white light:text-zinc-900 border border-white/15 dark:border-white/15 light:border-zinc-300"
                      : "text-zinc-300 dark:text-zinc-300 light:text-zinc-700 hover:bg-white/[0.04] dark:hover:bg-white/[0.04] light:hover:bg-zinc-100 hover:text-white dark:hover:text-white light:hover:text-zinc-950"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 glow-emerald"
                          : "bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200 text-zinc-400"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="font-medium text-xs truncate flex items-center gap-1.5 font-sans">
                        {org.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-zinc-400 font-mono capitalize">
                        {org.role || "member"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-1.5 border-t border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/20 dark:bg-black/40 light:bg-zinc-50 space-y-0.5">
            <Link
              href="/dashboard/settings/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-950 hover:bg-white/[0.04] dark:hover:bg-white/[0.04] light:hover:bg-zinc-200/60 transition-colors font-sans"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subscription & Plans</span>
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-950 hover:bg-white/[0.04] dark:hover:bg-white/[0.04] light:hover:bg-zinc-200/60 transition-colors font-sans"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-500 light:text-zinc-400" />
              <span>Workspace Settings & API Keys</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
