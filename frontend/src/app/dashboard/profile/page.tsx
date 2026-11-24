"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Edit3,
  ExternalLink,
  FolderGit2,
  GitPullRequest,
  Globe,
  HeartPulse,
  Image as ImageIcon,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";

const MONTHS = [
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
];

type AvatarShape = "circle" | "squircle" | "rounded" | "oval" | "diamond";

interface ProfileConfig {
  displayName: string;
  handle: string;
  bio: string;
  customPhoto: string | null;
  avatarShape: AvatarShape;
  isPrivate: boolean;
  showStats: boolean;
  showActivity: boolean;
  showShowcase: boolean;
  showRoi: boolean;
}

const STORAGE_KEY = "reflex_profile_config_v1";

function getActivityLevel(weekIdx: number, dayIdx: number): number {
  const seed = (weekIdx * 7 + dayIdx * 13) % 29;
  if (weekIdx > 44 && (dayIdx === 1 || dayIdx === 3 || dayIdx === 5)) return 3;
  if (weekIdx > 38 && seed < 6) return 2;
  if (seed === 0 || seed === 11) return 1;
  return 0;
}

function getShapeClasses(shape: AvatarShape, size: "lg" | "sm"): string {
  const dims = size === "lg" ? "w-24 h-24" : "w-11 h-11";
  switch (shape) {
    case "circle":
      return `${dims} rounded-full`;
    case "squircle":
      return `${dims} rounded-[32%]`;
    case "rounded":
      return `${dims} rounded-2xl`;
    case "oval":
      return size === "lg" ? "w-20 h-24 rounded-full" : "w-9 h-11 rounded-full";
    case "diamond":
      return `${dims} rounded-xl rotate-6`;
    default:
      return `${dims} rounded-full`;
  }
}

export default function ReflexProfilePage() {
  const { user, currentOrg, billingUsage, openUpgradeModal } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultConfig: ProfileConfig = {
    displayName: user?.name || "Yousef",
    handle: user?.email ? `@${user.email.split("@")[0]}` : "@yousiph",
    bio: "Founder & Autonomous SRE · Building self-healing production software.",
    customPhoto: null,
    avatarShape: "circle",
    isPrivate: true,
    showStats: true,
    showActivity: true,
    showShowcase: true,
    showRoi: true,
  };

  const [profile, setProfile] = useState<ProfileConfig>(defaultConfig);
  const [draft, setDraft] = useState<ProfileConfig>(defaultConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [activityView, setActivityView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [copiedShare, setCopiedShare] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Hydrate saved profile edits from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProfileConfig>;
        const merged = { ...defaultConfig, ...parsed };
        setProfile(merged);
        setDraft(merged);
        return;
      }
    } catch {}

    if (user?.name || user?.email) {
      const synced = {
        ...defaultConfig,
        displayName: user?.name || defaultConfig.displayName,
        handle: user?.email ? `@${user.email.split("@")[0]}` : defaultConfig.handle,
      };
      setProfile(synced);
      setDraft(synced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, user?.email]);

  const active = isEditing ? draft : profile;
  const avatarSrc = active.customPhoto || user?.avatarUrl || null;
  const initials = (active.displayName || "YU").slice(0, 2).toUpperCase();
  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toUpperCase();
  const healsUsed = billingUsage?.heals_used ?? 3;

  const triggerToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 2600);
  };

  const handleOpenEdit = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraft(profile);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const cleanedHandle = draft.handle.startsWith("@")
      ? draft.handle
      : `@${draft.handle}`;
    const finalProfile = { ...draft, handle: cleanedHandle };
    setProfile(finalProfile);
    setDraft(finalProfile);
    setIsEditing(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalProfile));
    } catch {}
    triggerToast("Profile updated & saved!");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      triggerToast("Please choose an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((prev) => ({ ...prev, customPhoto: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
    } catch {}
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2200);
  };

  const shapeOptions: AvatarShape[] = [
    "circle",
    "squircle",
    "rounded",
    "oval",
    "diamond",
  ];

  return (
    <div
      className={`relative w-full transition-all duration-300 ${
        isEditing ? "lg:pr-80" : ""
      }`}
    >
      <div className="relative w-full max-w-4xl mx-auto text-slate-900 dark:text-white space-y-10 pb-16">
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

        {/* 1. TOP RIGHT ACTION BAR (Edit · Private/Public · Share) */}
        {!isEditing && (
          <div className="relative z-10 flex items-center justify-end gap-2.5 text-xs font-mono">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-white/[0.04] hover:border-indigo-500/50 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const updated = { ...profile, isPrivate: !profile.isPrivate };
                setProfile(updated);
                setDraft(updated);
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                } catch {}
                triggerToast(
                  updated.isPrivate
                    ? "Profile visibility set to Private"
                    : "Profile visibility set to Public"
                );
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-white/[0.04] hover:border-indigo-500/40 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-all"
            >
              {active.isPrivate ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Public</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-white/[0.04] hover:border-indigo-500/40 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Copied
                  </span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 2. CENTERED PROFILE HERO (Live Inline-Editable in Edit Mode!) */}
        <section className="relative z-10 flex flex-col items-center text-center space-y-4 pt-2">
          {/* Avatar with Chosen Frame Shape */}
          <div className="relative group">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-indigo-500 via-violet-500 to-sky-400 opacity-35 blur-md" />
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={active.displayName}
                onClick={isEditing ? () => fileInputRef.current?.click() : undefined}
                className={`relative object-cover border-2 border-indigo-500/50 shadow-xl transition-all duration-300 ${getShapeClasses(
                  active.avatarShape,
                  "lg"
                )} ${isEditing ? "cursor-pointer hover:opacity-85" : ""}`}
              />
            ) : (
              <div
                onClick={isEditing ? () => fileInputRef.current?.click() : undefined}
                className={`relative bg-gradient-to-tr from-indigo-500 via-violet-500 to-sky-400 text-white font-mono text-3xl font-bold flex items-center justify-center shadow-xl transition-all duration-300 ${getShapeClasses(
                  active.avatarShape,
                  "lg"
                )} ${isEditing ? "cursor-pointer hover:opacity-90" : ""}`}
              >
                <span className={active.avatarShape === "diamond" ? "-rotate-6" : ""}>
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* Name, Handle & Bio (Switches cleanly to inline inputs like ChatGPT!) */}
          {!isEditing ? (
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {active.displayName}
                </h1>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  {activePlan}
                </span>
              </div>
              <p className="text-sm font-mono text-slate-500 dark:text-slate-400">
                {active.handle}
              </p>
              {active.bio && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                  {active.bio}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 w-full max-w-xs">
              <input
                type="text"
                value={draft.displayName}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, displayName: e.target.value }))
                }
                placeholder="Your Name"
                className="w-full text-center text-2xl font-bold px-3 py-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.06] border border-indigo-500/40 text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <input
                type="text"
                value={draft.handle}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, handle: e.target.value }))
                }
                placeholder="@username"
                className="w-44 text-center text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={draft.bio}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="A little about you"
                className="w-full text-center text-xs px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* 3. CENTERED 4-STAT CAPSULE BAR */}
          {active.showStats && (
            <div className="w-full max-w-2xl mt-2 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-[#0b0d17]/90 backdrop-blur-xl shadow-sm grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-white/10">
              <div className="py-4 px-3">
                <div className="font-mono text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {healsUsed}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Lifetime Reflexes
                </div>
              </div>

              <div className="py-4 px-3">
                <div className="font-mono text-xl font-extrabold text-sky-600 dark:text-sky-400">
                  38 sec
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Fastest MTTR
                </div>
              </div>

              <div className="py-4 px-3">
                <div className="font-mono text-xl font-extrabold text-violet-600 dark:text-violet-400">
                  7.5 hrs
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Time Reclaimed
                </div>
              </div>

              <div className="py-4 px-3">
                <div className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {active.showRoi ? "$487.50" : "99.8%"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {active.showRoi ? "Payroll Saved" : "Avg Vitality"}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. SHOWCASE SECTION */}
        {active.showShowcase && (
          <section className="relative z-10 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Showcase · Protected Repositories
              </h2>
              <Link
                href="/dashboard/repositories"
                className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Manage repos →
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-[#0b0d17]/90 backdrop-blur-xl p-6 shadow-sm space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    name: "yousiph-coder/reflex",
                    stack: "Next.js 15 + FastAPI",
                    vitality: "99.8%",
                    prs: "3 PRs Merged",
                    url: "https://github.com/yousiph-coder/reflex",
                  },
                  {
                    name: "yousiph-coder/Vireon",
                    stack: "Node.js + TypeScript",
                    vitality: "100%",
                    prs: "PR #3 Verified (38s)",
                    url: "https://github.com/yousiph-coder/Vireon/pull/3",
                  },
                ].map((repo, idx) => (
                  <a
                    key={idx}
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] hover:border-indigo-500/40 p-4 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-950 dark:text-white group-hover:text-indigo-500 transition-colors">
                        <FolderGit2 className="w-4 h-4 text-indigo-500" />
                        <span>{repo.name}</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {repo.stack}
                      </div>
                      <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <HeartPulse className="w-3 h-3" />
                          {repo.vitality}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <GitPullRequest className="w-3 h-3" />
                          {repo.prs}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {activePlan === "FREE" && (
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-white/10">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Upgrade to Reflex Pro to showcase unlimited protected repositories.
                  </span>
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Upgrade to Pro</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 5. REFLEX ACTIVITY HEATMAP */}
        {active.showActivity && (
          <section className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>Reflex Healing Activity</span>
              </h2>

              <div className="flex items-center gap-4 text-xs font-mono">
                {(["daily", "weekly", "monthly"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActivityView(view)}
                    className={`capitalize transition-colors ${
                      activityView === view
                        ? "text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-[#0b0d17]/90 backdrop-blur-xl p-6 shadow-sm overflow-x-auto">
              <div className="min-w-[640px] space-y-3">
                <div className="grid grid-flow-col grid-rows-7 gap-1.5 justify-between">
                  {Array.from({ length: 48 }).map((_, weekIdx) =>
                    Array.from({ length: 7 }).map((__, dayIdx) => {
                      const level = getActivityLevel(weekIdx, dayIdx);
                      const dotColor =
                        level === 3
                          ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                          : level === 2
                          ? "bg-violet-400/80 dark:bg-violet-500/70"
                          : level === 1
                          ? "bg-indigo-300/60 dark:bg-indigo-500/35"
                          : "bg-slate-200/80 dark:bg-white/[0.06]";
                      return (
                        <span
                          key={`${weekIdx}-${dayIdx}`}
                          title={
                            level > 0
                              ? `${level} autonomous Reflex(es) verified`
                              : "0 crashes — 100% healthy"
                          }
                          className={`w-2.5 h-2.5 rounded-full transition-transform hover:scale-150 ${dotColor}`}
                        />
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                  {MONTHS.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* =================================================================== */}
      {/* CHATGPT-STYLE RIGHT-SIDE "EDIT PROFILE" DRAWER                      */}
      {/* =================================================================== */}
      {isEditing && (
        <aside className="fixed top-0 right-0 h-screen w-full sm:w-80 border-l border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0a0c14]/95 backdrop-blur-2xl shadow-2xl z-50 flex flex-col justify-between p-5 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="space-y-6">
            {/* Drawer Header: Edit profile · Cancel · Save */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <span className="text-sm font-bold text-slate-950 dark:text-white">
                Edit profile
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-sm transition-all"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Hidden File Input for Upload Photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* PHOTO SECTION (Upload Photo + 5 Avatar Shapes) */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-900 dark:text-white">
                Photo
              </label>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-3.5 space-y-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                  <span>Upload photo</span>
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                </button>

                {/* 5 Avatar Shape Presets */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {shapeOptions.map((shape) => {
                    const selected = draft.avatarShape === shape;
                    return (
                      <button
                        key={shape}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, avatarShape: shape }))
                        }
                        className="relative group focus:outline-none"
                        title={`Shape: ${shape}`}
                      >
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={shape}
                            className={`object-cover border transition-all ${getShapeClasses(
                              shape,
                              "sm"
                            )} ${
                              selected
                                ? "border-indigo-500 ring-2 ring-indigo-500/40"
                                : "border-slate-300 dark:border-white/15 opacity-75 group-hover:opacity-100"
                            }`}
                          />
                        ) : (
                          <div
                            className={`bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-mono text-xs font-bold flex items-center justify-center border transition-all ${getShapeClasses(
                              shape,
                              "sm"
                            )} ${
                              selected
                                ? "border-white ring-2 ring-indigo-500"
                                : "border-transparent opacity-75 group-hover:opacity-100"
                            }`}
                          >
                            <span className={shape === "diamond" ? "-rotate-6" : ""}>
                              {initials}
                            </span>
                          </div>
                        )}

                        {selected && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {draft.customPhoto && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, customPhoto: null }))
                    }
                    className="text-[11px] font-mono text-rose-500 hover:underline"
                  >
                    Remove uploaded photo
                  </button>
                )}
              </div>
            </div>

            {/* WHAT OTHERS SEE SECTION (Live Visibility Toggles) */}
            <div className="space-y-2.5">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  What others see
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose which sections are visible when you share your Reflex profile
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] divide-y divide-slate-200/80 dark:divide-white/10">
                {[
                  { key: "showStats" as const, label: "Show Reflex statistics" },
                  { key: "showActivity" as const, label: "Show activity graph" },
                  { key: "showShowcase" as const, label: "Show protected repos" },
                  { key: "showRoi" as const, label: "Show ROI payroll saved" },
                ].map((item) => {
                  const enabled = draft[item.key];
                  return (
                    <div
                      key={item.key}
                      className="px-3.5 py-3 flex items-center justify-between gap-3"
                    >
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                        }
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                          enabled
                            ? "bg-indigo-500 justify-end"
                            : "bg-slate-300 dark:bg-white/15 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 text-[11px] font-mono text-slate-400 text-center">
            Changes preview live on your profile
          </div>
        </aside>
      )}

      {/* Save Toast */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{savedToast}</span>
        </div>
      )}
    </div>
  );
}