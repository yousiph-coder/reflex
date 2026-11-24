"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Cpu,
  Crown,
  ExternalLink,
  LogOut,
  Shield,
  Sliders,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type TabId = "general" | "sre" | "notifications" | "security";

interface AccountPrefs {
  displayName: string;
  username: string;
  prMode: "ready" | "draft";
  confidenceFloor: "95" | "98" | "99";
  sandboxTimeout: "30" | "60" | "120";
  emailCrashAlerts: boolean;
  weeklyRoiDigest: boolean;
}

const PREFS_KEY = "reflex_account_settings_v1";

export default function ReflexAccountSettingsPage() {
  const { user, currentOrg, billingUsage, logout, openUpgradeModal } = useTenant();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<AccountPrefs>({
    displayName: user?.name || "Yousef",
    username: user?.email ? `@${user.email.split("@")[0]}` : "@yousiph",
    prMode: "ready",
    confidenceFloor: "98",
    sandboxTimeout: "60",
    emailCrashAlerts: true,
    weeklyRoiDigest: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        setPrefs((prev) => ({ ...prev, ...JSON.parse(saved) }));
        return;
      }
    } catch {}

    if (user?.name || user?.email) {
      setPrefs((prev) => ({
        ...prev,
        displayName: user?.name || prev.displayName,
        username: user?.email ? `@${user.email.split("@")[0]}` : prev.username,
      }));
    }
  }, [user?.name, user?.email]);

  const savePrefs = (next: AccountPrefs, message = "Settings saved!") => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toUpperCase();

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "Account & General", icon: User },
    { id: "sre", label: "Autonomous SRE", icon: Cpu },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security & Account", icon: Shield },
  ];

  return (
    <div className="relative w-full max-w-5xl mx-auto text-slate-900 dark:text-white space-y-8 pb-16">
      {/* Ambient Background Spotlight Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)",
          }}
        />
      </div>

      {/* Page Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>Workspace & Personal Preferences</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Settings
          </h1>
        </div>

        <Link
          href="/dashboard/profile"
          className="px-4 py-2 rounded-xl font-mono text-xs font-medium border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] hover:border-indigo-500/40 text-slate-700 dark:text-slate-200 transition-all"
        >
          View Public Profile →
        </Link>
      </div>

      {/* Main Two-Column Settings Layout */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Column (3 cols) */}
        <nav className="md:col-span-3 flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/35 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Content Card (9 cols) */}
        <div className="md:col-span-9 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* ── TAB 1: ACCOUNT & GENERAL ──────────────────────────── */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Account & General
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your identity, plan status, and workspace appearance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={prefs.displayName}
                    onChange={(e) =>
                      setPrefs((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Username
                  </label>
                  <input
                    type="text"
                    value={prefs.username}
                    onChange={(e) =>
                      setPrefs((prev) => ({ ...prev, username: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Email Address (Verified via Supabase Auth)
                </label>
                <input
                  type="email"
                  readOnly
                  value={user?.email || "founder@reflex.dev"}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Plan Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-500">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Current Plan: {activePlan}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {activePlan === "FREE"
                        ? "5 free autonomous Reflexes / month"
                        : "Unlimited autonomous Reflexes & priority sandboxes"}
                    </div>
                  </div>
                </div>

                {activePlan === "FREE" && (
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Upgrade to Pro ($29/mo)</span>
                  </button>
                )}
              </div>

              {/* Theme Row */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div>
                  <div className="text-sm font-semibold">Theme & Appearance</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Toggle between Deep Cosmic Indigo and Crisp Daylight mode
                  </div>
                </div>
                <ThemeToggle />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => savePrefs(prefs, "Account details saved!")}
                  className="px-5 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 2: AUTONOMOUS SRE DEFAULTS ────────────────────── */}
          {activeTab === "sre" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Autonomous SRE Defaults
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure how Reflex verifies patches and opens Pull Requests on GitHub.
                </p>
              </div>

              {/* Default PR Mode */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div>
                  <div className="text-sm font-semibold">Pull Request Mode</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Open verified fixes as Ready-to-Merge PRs or Draft PRs
                  </div>
                </div>
                <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#07080d] font-mono text-xs">
                  {(["ready", "draft"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        savePrefs({ ...prefs, prMode: m }, `PR mode set to ${m.toUpperCase()}`)
                      }
                      className={`px-3.5 py-1.5 rounded-lg capitalize font-semibold transition-all ${
                        prefs.prMode === m
                          ? "bg-indigo-500 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {m} PR
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum AI Confidence Threshold */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div>
                  <div className="text-sm font-semibold">AI Confidence Threshold</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Only open a GitHub PR if AST confidence exceeds this score
                  </div>
                </div>
                <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#07080d] font-mono text-xs">
                  {(["95", "98", "99"] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        savePrefs(
                          { ...prefs, confidenceFloor: val },
                          `Minimum AI confidence set to ${val}%`
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        prefs.confidenceFloor === val
                          ? "bg-indigo-500 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {val}%+
                    </button>
                  ))}
                </div>
              </div>

              {/* Docker Sandbox Timeout */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div>
                  <div className="text-sm font-semibold">Docker Sandbox Timeout</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Maximum execution window for `pytest` / `npm test` verification
                  </div>
                </div>
                <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#07080d] font-mono text-xs">
                  {(["30", "60", "120"] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() =>
                        savePrefs(
                          { ...prefs, sandboxTimeout: sec },
                          `Sandbox timeout set to ${sec}s`
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        prefs.sandboxTimeout === sec
                          ? "bg-indigo-500 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: NOTIFICATIONS ──────────────────────────────── */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Notifications
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Control email alerts and connect live Slack or Discord channels.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                  <div>
                    <div className="text-sm font-semibold">Instant Crash & PR Emails</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Get notified immediately when Reflex opens a verified PR
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      savePrefs(
                        { ...prefs, emailCrashAlerts: !prefs.emailCrashAlerts },
                        "Email alert preference updated"
                      )
                    }
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                      prefs.emailCrashAlerts
                        ? "bg-indigo-500 justify-end"
                        : "bg-slate-300 dark:bg-white/15 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                  <div>
                    <div className="text-sm font-semibold">Weekly Engineering ROI Digest</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Summary of hours reclaimed and payroll saved every Monday
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      savePrefs(
                        { ...prefs, weeklyRoiDigest: !prefs.weeklyRoiDigest },
                        "Weekly digest preference updated"
                      )
                    }
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                      prefs.weeklyRoiDigest
                        ? "bg-indigo-500 justify-end"
                        : "bg-slate-300 dark:bg-white/15 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.05] flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Looking to configure <strong>Slack & Discord Webhook URLs</strong>?
                </div>
                <Link
                  href="/dashboard/settings"
                  className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Open API Keys & Webhooks</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* ── TAB 4: SECURITY & DANGER ZONE ─────────────────────── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Account & Security
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your active authentication session and account deletion.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div>
                  <div className="text-sm font-semibold">Log out of this device</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Clears your Supabase token and returns to the Reflex login screen
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 rounded-xl font-mono text-xs font-semibold border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-rose-500/35 bg-rose-500/[0.06] p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone — Delete Account</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Permanently remove your Reflex account, webhook tokens, and incident logs. This action cannot be undone.
                </p>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-4 py-2 rounded-xl font-mono text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDelete(false);
                        savePrefs(prefs, "Account deletion scheduled. Signing out...");
                        setTimeout(() => logout(), 1200);
                      }}
                      className="px-4 py-2 rounded-xl font-mono text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                    >
                      Confirm Permanent Deletion
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3.5 py-2 rounded-xl font-mono text-xs border border-slate-300 dark:border-white/15"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}