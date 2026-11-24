"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  Command,
  CreditCard,
  FolderGit2,
  KeyRound,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { ThemeToggle } from "./ThemeToggle";
import { UserNavMenu } from "./UserNavMenu";
import { CommandPalette } from "./CommandPalette";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Incident Explorer",
    href: "/dashboard/incidents",
    icon: AlertTriangle,
    exact: false,
  },
  {
    label: "Repositories",
    href: "/dashboard/repositories",
    icon: FolderGit2,
    exact: false,
  },
  {
    label: "Plans & Billing",
    href: "/dashboard/settings/billing",
    icon: CreditCard,
    exact: false,
  },
  {
    label: "API Keys & Setup",
    href: "/dashboard/settings",
    icon: KeyRound,
    exact: true,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const {
    currentOrg,
    organizations,
    switchOrganization,
    billingUsage,
    openUpgradeModal,
  } = useTenant();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("autoheal_sidebar_collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
    } catch {}
  }, []);

  // Global Cmd+K / Ctrl+K shortcut for Search
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        orgMenuRef.current &&
        !orgMenuRef.current.contains(event.target as Node)
      ) {
        setIsOrgMenuOpen(false);
      }
    }
    if (isOrgMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOrgMenuOpen]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("autoheal_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toLowerCase();
  const isPro = activePlan === "pro";
  const isEnterprise = activePlan === "enterprise";
  const healsUsed = billingUsage?.heals_used ?? 0;
  const maxLimit = billingUsage?.limit ?? 5;
  const usagePct = Math.min(100, Math.round((healsUsed / maxLimit) * 100));

  return (
    <>
      <aside
        style={{ width: isCollapsed ? 72 : 260 }}
        className="h-screen sticky top-0 flex-shrink-0 border-r border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0a0c14]/95 backdrop-blur-2xl flex flex-col justify-between select-none z-30 transition-all duration-200"
      >
        {/* ── Top Area: Brand + Search + Navigation ───────────────── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top Brand & Org Switcher */}
          <div className="h-16 flex items-center px-3 border-b border-slate-200 dark:border-white/10 relative">
            {!isCollapsed ? (
              <div
                className="flex items-center justify-between w-full gap-2"
                ref={orgMenuRef}
              >
                <button
                  type="button"
                  onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all text-left flex-1 min-w-0 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.35)]">
                    <div className="w-3.5 h-3.5 rounded-sm bg-gradient-to-tr from-indigo-500 via-violet-500 to-sky-400 rotate-45" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate font-mono">
                        {currentOrg?.name || "Reflex"}
                      </span>
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-mono">
                        {isPro ? "PRO" : "FREE"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                      <span>Switch Org</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          isOrgMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>

                {isOrgMenuOpen && (
                  <div className="absolute top-[68px] left-3 w-64 rounded-2xl bg-white dark:bg-[#0d101b] border border-slate-200 dark:border-white/15 z-50 overflow-hidden shadow-2xl">
                    <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                        Workspaces
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {organizations.length} Available
                      </span>
                    </div>

                    <div className="p-1.5 space-y-1 max-h-56 overflow-y-auto">
                      {organizations.map((org) => {
                        const isSelected = org.id === currentOrg?.id;
                        return (
                          <button
                            type="button"
                            key={org.id}
                            onClick={() => {
                              switchOrganization(org.id);
                              setIsOrgMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs font-mono ${
                              isSelected
                                ? "bg-indigo-500/10 text-slate-900 dark:text-white border border-indigo-500/30"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <span className="truncate">{org.name}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-2 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsOrgMenuOpen(false)}
                        className="flex items-center gap-2 p-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-mono"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>API Keys & Setup</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105 transition-all group"
                  title="Expand sidebar"
                >
                  <Sparkles className="w-5 h-5 group-hover:hidden" />
                  <PanelLeftOpen className="w-5 h-5 hidden group-hover:block text-indigo-400" />
                </button>
              </div>
            )}
          </div>

          {/* ── Search Button Right Above Overview (Linear Style) ─── */}
          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className={`w-full flex items-center transition-all rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.03] hover:border-indigo-500/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white ${
                isCollapsed
                  ? "justify-center w-10 h-10 mx-auto"
                  : "justify-between px-3 py-2 text-xs"
              }`}
              title="Search (Ctrl+K)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">Search...</span>}
              </div>
              {!isCollapsed && (
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                  <Command className="w-2.5 h-2.5" />
                  <span>K</span>
                </kbd>
              )}
            </button>
          </div>

          {/* ── Navigation Items ───────────────────────────────────── */}
          <nav className="p-3 space-y-1.5 overflow-y-auto overflow-x-hidden flex-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative group flex items-center transition-all duration-150 ${
                    isCollapsed
                      ? "justify-center w-10 h-10 mx-auto rounded-xl"
                      : "justify-start px-3.5 py-2.5 w-full rounded-xl gap-3 text-sm"
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/35 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive
                        ? "text-indigo-500 dark:text-indigo-400"
                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                    }`}
                  />
                  {!isCollapsed && (
                    <span
                      className={`truncate font-medium ${
                        isActive ? "font-semibold" : ""
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Bottom Section: Quota + Profile & Theme Toggle ──────── */}
        <div className="border-t border-slate-200 dark:border-white/10 p-3 space-y-3 bg-slate-50/40 dark:bg-white/[0.01]">
          {/* Free Quota Mini Card */}
          {!isEnterprise && !isPro && (
            <div>
              {!isCollapsed ? (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400">
                      Free Quota
                    </span>
                    <span className="text-slate-900 dark:text-white font-semibold">
                      {healsUsed}/{maxLimit} Reflexes
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        healsUsed >= maxLimit
                          ? "bg-rose-500"
                          : "bg-gradient-to-r from-indigo-500 to-violet-500"
                      }`}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_0_15px_rgba(99,102,241,0.35)] transition-all font-mono flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Upgrade Pro ($29)</span>
                  </button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 flex items-center justify-center text-indigo-400 transition-all"
                    title="Upgrade Pro ($29)"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User Profile & Theme Toggle (Replaced old dev footer!) */}
          <div
            className={`flex items-center pt-1 ${
              isCollapsed ? "flex-col gap-2.5 justify-center" : "justify-between px-1"
            }`}
          >
            <UserNavMenu isCollapsed={isCollapsed} />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Command Palette triggered from Sidebar Search button */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}

export default AppSidebar;