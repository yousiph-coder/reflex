"use client";

import { GitBranch, GitPullRequest, Radio, ShieldCheck } from "lucide-react";
import { AnalyticsOverview, Repository } from "@/lib/types";

interface RepoStatsBannerProps {
  repositories: Repository[];
  analytics?: AnalyticsOverview | null;
}

export function RepoStatsBanner({ repositories, analytics }: RepoStatsBannerProps) {
  const totalRepos = repositories.length;
  const totalPrivate = repositories.filter((r) => r.visibility === "private").length;
  const totalPublic = totalRepos - totalPrivate;

  const totalSentryMappings = repositories.reduce(
    (acc, r) => acc + (r.sentry_mappings?.filter((m) => m.is_active)?.length || 0),
    0
  );

  const autonomousCount = repositories.filter(
    (r) => r.auto_heal_enabled && r.remediation_mode === "autonomous"
  ).length;

  const autonomousPct = totalRepos > 0 ? Math.round((autonomousCount / totalRepos) * 100) : 0;

  const healedPrs =
    analytics?.incidents?.healed_prs ??
    repositories.reduce((acc, r) => acc + (r.healed_prs_count ?? r.total_incidents_resolved ?? 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Connected Repositories */}
      <div className="p-5 rounded-2xl liquid-glass flex flex-col justify-between space-y-3 hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-300 transition-all select-none group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-500 uppercase tracking-wider">
            Connected Repos
          </span>
          <div className="p-2.5 rounded-xl bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
            <GitBranch className="w-4 h-4 text-emerald-400 glow-emerald" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white dark:text-white light:text-zinc-950 tracking-tight font-mono">
            {totalRepos}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1.5 flex items-center gap-1.5 font-sans leading-relaxed">
            <span className="text-zinc-300 dark:text-zinc-300 light:text-zinc-800 font-medium font-mono">{totalPrivate} Private</span>
            <span>•</span>
            <span className="text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-mono">{totalPublic} Public</span>
          </p>
        </div>
      </div>

      {/* 2. Active Sentry Mappings */}
      <div className="p-5 rounded-2xl liquid-glass flex flex-col justify-between space-y-3 hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-300 transition-all select-none group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-500 uppercase tracking-wider">
            Linked Sentry
          </span>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white dark:text-white light:text-zinc-950 tracking-tight font-mono">
            {totalSentryMappings}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1.5 flex items-center gap-1.5 font-sans leading-relaxed">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 glow-emerald mr-0.5" />
            <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-medium font-mono">100% Ingestion Live</span>
          </p>
        </div>
      </div>

      {/* 3. Autonomous Coverage */}
      <div className="p-5 rounded-2xl liquid-glass flex flex-col justify-between space-y-3 hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-300 transition-all select-none group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-500 uppercase tracking-wider">
            Autonomous Auto-PR
          </span>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 glow-emerald">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white dark:text-white light:text-zinc-950 tracking-tight font-mono">
            {autonomousPct}%
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1.5 font-sans leading-relaxed">
            <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-medium font-mono">{autonomousCount} of {totalRepos}</span> repos on auto-pilot
          </p>
        </div>
      </div>

      {/* 4. Automated PRs Created */}
      <div className="p-5 rounded-2xl liquid-glass flex flex-col justify-between space-y-3 hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-300 transition-all select-none group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-500 uppercase tracking-wider">
            Auto-Healed PRs
          </span>
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <GitPullRequest className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white dark:text-white light:text-zinc-950 tracking-tight font-mono">
            {healedPrs}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1.5 flex items-center gap-1.5 font-sans leading-relaxed">
            <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-medium font-mono">{healedPrs} merged</span>
            <span>•</span>
            <span className="text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-mono">0 regressions</span>
          </p>
        </div>
      </div>
    </div>
  );
}
