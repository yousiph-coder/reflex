"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CreditCard,
  ExternalLink,
  FolderGit2,
  GitPullRequest,
  KeyRound,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
  Settings,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/context/TenantContext";

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
    label: "Repositories",
    href: "/dashboard/repositories",
    icon: FolderGit2,
  },
  {
    label: "Plans & Billing",
    href: "/dashboard/settings/billing",
    icon: CreditCard,
  },
  {
    label: "API Keys & Setup",
    href: "/dashboard/settings",
    icon: KeyRound,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { currentOrg, organizations, switchOrganization, billingUsage, openUpgradeModal } = useTenant();

  // ── 1. Collapsible State with LocalStorage Persistence ───────────
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read persisted sidebar collapse state
    try {
      const savedCollapsed = localStorage.getItem("autoheal_sidebar_collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
      const savedDismissed = localStorage.getItem("autoheal_onboarding_dismissed");
      if (savedDismissed !== null) {
        setIsOnboardingDismissed(savedDismissed === "true");
      }
    } catch {
      // Ignore localStorage errors (e.g., SSR or private browsing)
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("autoheal_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleDismissOnboarding = () => {
    setIsOnboardingDismissed(true);
    try {
      localStorage.setItem("autoheal_onboarding_dismissed", "true");
    } catch {}
  };

  // Close workspace dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
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

  // Derived plan & usage metrics
  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toLowerCase();
  const isPro = activePlan === "pro";
  const isEnterprise = activePlan === "enterprise";
  const healsUsed = billingUsage?.heals_used ?? 0;
  const maxLimit = billingUsage?.limit ?? 5;
  const usagePct = Math.min(100, Math.round((healsUsed / maxLimit) * 100));

  // Onboarding milestones
  const onboardingSteps = [
    { title: "Connect GitHub Repo", done: true, href: "/dashboard/repositories" },
    { title: "Configure Sentry Webhook", done: true, href: "/dashboard/settings" },
    { title: "Run Sandbox Verification", done: false, href: "/dashboard/incidents" },
  ];
  const completedCount = onboardingSteps.filter((s) => s.done).length;
  const onboardingPct = Math.round((completedCount / onboardingSteps.length) * 100);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="h-screen sticky top-0 flex-shrink-0 border-r border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-black/90 backdrop-blur-2xl flex flex-col justify-between select-none z-30 transition-colors duration-200"
    >
      {/* ── Top Area: Header + Navigation ────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ── Top of Sidebar: Logo + Workspace Switcher ────────────── */}
        <div className="h-16 flex items-center px-3 border-b border-zinc-200 dark:border-white/10 relative">
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full gap-2" ref={orgMenuRef}>
              {/* Logo + Organization Trigger Button */}
              <button
                type="button"
                onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all text-left flex-1 min-w-0 group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-glow-emerald flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-zinc-900 dark:text-white truncate font-mono">
                      {currentOrg?.name || "AutoHeal"}
                    </span>
                    {isPro ? (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-glow-emerald font-mono">
                        PRO
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-zinc-100 dark:bg-white/10 text-zinc-500 font-mono">
                        FREE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-1">
                    <span>Switch Org</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOrgMenuOpen && "rotate-180")} />
                  </p>
                </div>
              </button>

              {/* Sidebar Collapse Toggle */}
              <button
                type="button"
                onClick={handleToggleCollapse}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>

              {/* Workspace Switcher Floating Dropdown */}
              {isOrgMenuOpen && (
                <div className="absolute top-[68px] left-3 w-64 rounded-2xl liquid-glass-elevated border border-zinc-200 dark:border-white/15 z-50 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                      Workspaces
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
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
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs font-mono",
                            isSelected
                              ? "bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/15 shadow-sm"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate">{org.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setIsOrgMenuOpen(false)}
                      className="flex items-center gap-2 p-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors font-mono"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Workspace Settings</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Collapsed Header: Centered Logo + Quick Expand Button */
            <div className="w-full flex items-center justify-center relative group">
              <button
                type="button"
                onClick={handleToggleCollapse}
                className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-glow-emerald hover:scale-105 transition-all"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <Sparkles className="w-5 h-5 group-hover:hidden" />
                <PanelLeftOpen className="w-5 h-5 hidden group-hover:block text-emerald-400" />
              </button>

              {/* Tooltip on Collapsed Logo */}
              <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1.5 transition-all duration-150">
                <div className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-white bg-zinc-900/95 dark:bg-black/95 border border-white/15 shadow-2xl backdrop-blur-xl whitespace-nowrap flex items-center gap-1.5 shadow-glow-emerald">
                  <span>{currentOrg?.name || "AutoHeal"}</span>
                  <span className="text-[10px] text-emerald-400">({activePlan.toUpperCase()})</span>
                  <span className="text-zinc-400">• Click to expand</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation Items (Bug-Free Strict Center Alignment) ─── */}
        <nav className="p-3 space-y-1 overflow-y-auto overflow-x-hidden flex-1">
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
                  "relative group flex items-center transition-all duration-150",
                  isCollapsed
                    ? "justify-center w-10 h-10 mx-auto rounded-xl"
                    : "justify-start px-3 py-2 w-full rounded-xl gap-3 text-sm",
                  isActive
                    ? "bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/15 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-white/[0.03]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    isActive ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                  )}
                />

                {!isCollapsed && (
                  <span className={cn("truncate font-medium font-sans", isActive && "font-semibold text-emerald-600 dark:text-emerald-400")}>
                    {item.label}
                  </span>
                )}

                {/* Tooltip Hover Popup for Icons in Collapsed Mode */}
                {isCollapsed && (
                  <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1.5 transition-all duration-150">
                    <div className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-white bg-zinc-900/95 dark:bg-black/95 border border-white/15 shadow-2xl backdrop-blur-xl whitespace-nowrap flex items-center gap-1.5 shadow-glow-emerald">
                      {item.label}
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-glow-emerald" />}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom Section: Usage, Onboarding & Engine Widget ────── */}
      <div className="border-t border-zinc-200 dark:border-white/10 p-3 space-y-3 bg-zinc-50/40 dark:bg-white/[0.01]">
        {/* ── Onboarding Checklist Widget (Pinned at Bottom) ──────── */}
        {!isOnboardingDismissed && (
          <div>
            {!isCollapsed ? (
              <div className="p-3.5 rounded-2xl liquid-glass border border-emerald-500/25 bg-emerald-500/5 shadow-glow-emerald space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-zinc-900 dark:text-white">
                    <Rocket className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Setup Checklist</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ({completedCount}/{onboardingSteps.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissOnboarding}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors p-0.5 rounded"
                    title="Dismiss checklist"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-full bg-zinc-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 shadow-glow-emerald rounded-full transition-all duration-500"
                    style={{ width: `${onboardingPct}%` }}
                  />
                </div>

                {/* Steps List */}
                <div className="space-y-1.5 text-[11px] font-mono">
                  {onboardingSteps.map((step, idx) => (
                    <Link
                      key={idx}
                      href={step.href}
                      className={cn(
                        "flex items-center gap-2 transition-colors",
                        step.done
                          ? "text-zinc-500 line-through"
                          : "text-zinc-800 dark:text-zinc-200 hover:text-emerald-500 dark:hover:text-emerald-400 font-medium"
                      )}
                    >
                      {step.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      )}
                      <span className="truncate">{step.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              /* Collapsed Onboarding Progress Badge */
              <div className="relative group flex justify-center">
                <div className="w-10 h-10 rounded-xl liquid-glass border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-glow-emerald cursor-pointer">
                  <Rocket className="w-4 h-4" />
                </div>

                {/* Tooltip Checklist Summary */}
                <div className="absolute left-[calc(100%+14px)] bottom-0 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1.5 transition-all duration-150">
                  <div className="w-56 p-3 rounded-xl text-xs font-mono text-white bg-zinc-900/95 dark:bg-black/95 border border-white/15 shadow-2xl backdrop-blur-xl space-y-2 shadow-glow-emerald">
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span>Setup Checklist</span>
                      <span className="text-emerald-400">{completedCount}/{onboardingSteps.length} Complete</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-zinc-300">
                      {onboardingSteps.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {s.done ? <Check className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-amber-400" />}
                          <span className={s.done ? "line-through text-zinc-500" : ""}>{s.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Subscription / Usage Mini Bar ──────────────────────── */}
        {!isEnterprise && !isPro && (
          <div>
            {!isCollapsed ? (
              <div className="p-3 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-600 dark:text-zinc-400">Free Tier Usage</span>
                  <span className="text-zinc-900 dark:text-white font-semibold">
                    {healsUsed}/{maxLimit} heals
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      healsUsed >= maxLimit ? "bg-rose-500 shadow-glow-crimson" : "bg-emerald-500 shadow-glow-emerald"
                    )}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={openUpgradeModal}
                  className="w-full py-1 rounded-lg text-[10px] font-semibold text-black bg-emerald-500 hover:bg-emerald-400 shadow-glow-emerald transition-all font-mono flex items-center justify-center gap-1"
                >
                  <Zap className="w-3 h-3 text-black fill-black" />
                  Upgrade Pro ($29)
                </button>
              </div>
            ) : (
              /* Collapsed Upgrade Trigger */
              <div className="relative group flex justify-center">
                <button
                  type="button"
                  onClick={openUpgradeModal}
                  className="w-10 h-10 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10 hover:border-emerald-500/40 flex items-center justify-center text-emerald-500 dark:text-emerald-400 transition-all"
                  aria-label="Upgrade plan"
                >
                  <Zap className="w-4 h-4" />
                </button>
                <div className="absolute left-[calc(100%+14px)] bottom-0 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1.5 transition-all duration-150">
                  <div className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-white bg-zinc-900/95 dark:bg-black/95 border border-white/15 shadow-2xl backdrop-blur-xl whitespace-nowrap shadow-glow-emerald">
                    Usage: {healsUsed}/{maxLimit} heals • Upgrade to Pro
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Engine Status Capsule ───────────────────────────────── */}
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-mono text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow-emerald" />
              v1.0 Operational
            </span>
            <a
              href="https://github.com/yousiph-coder/autoheal-target-demo"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-500 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <GitPullRequest className="w-3 h-3 text-purple-400" />
              demo
            </a>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
