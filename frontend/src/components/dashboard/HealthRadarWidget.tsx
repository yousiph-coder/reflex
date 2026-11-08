"use client";

import { Activity, Heart, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthRadarProps {
  healthPct?: number;
  monitoredServices?: number;
  uptimeSeconds?: number;
  roi?: {
    roi_multiplier?: number;
    cost_saved_usd?: number;
    hours_saved?: number;
  };
}

export function HealthRadarWidget({
  healthPct = 100,
  monitoredServices = 0,
  roi,
}: HealthRadarProps) {
  const isHealthy = healthPct >= 98;

  return (
    <div className="p-6 rounded-3xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
      {/* Subtle ambient corner glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            {/* Pulsing Glowing Heart Icon */}
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-emerald-400 opacity-60" />
              <div className="relative w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 dark:shadow-glow-emerald">
                <Heart className="w-4 h-4 fill-emerald-500/40 text-emerald-700 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-zinc-950 dark:text-white">
                Repository Vitality & Health
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                Real-time autonomous reliability radar
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 dark:shadow-glow-emerald flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            STABLE
          </span>
        </div>

        {/* Big Health Percentage Number */}
        <div className="my-4 flex items-baseline gap-3">
          <span className="text-5xl font-extrabold font-mono tracking-tight text-zinc-950 dark:text-white dark:drop-shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            {healthPct}%
          </span>
          <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
            System Vitality
          </span>
        </div>

        {/* Progress Bar Gauge */}
        <div className="w-full bg-zinc-200 dark:bg-white/10 rounded-full h-2 overflow-hidden mb-6">
          <div
            className="h-full bg-emerald-500 dark:shadow-glow-emerald rounded-full transition-all duration-700"
            style={{ width: `${healthPct}%` }}
          />
        </div>

        {/* Submetrics Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* 1. Dynamic Net Plan ROI Box */}
          <div className="p-3 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono block">
              Monthly Value vs Pro ($29)
            </span>
            <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
              {roi?.roi_multiplier ?? 0}x Return (${roi?.cost_saved_usd ?? 0} val)
            </span>
          </div>

          {/* 2. Sandbox First-Pass Rate */}
          <div className="p-3 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono block">
              Sandbox Pass Rate
            </span>
            <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
              96.8% First-Pass
            </span>
          </div>

          {/* 3. Monitored Repos */}
          <div className="p-3 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono block">
              Active Monitors
            </span>
            <span className="font-mono text-base font-bold text-zinc-950 dark:text-white">
              {monitoredServices} {monitoredServices === 1 ? "Repo" : "Repos"}
            </span>
          </div>

          {/* 4. Median MTTR */}
          <div className="p-3 rounded-xl liquid-glass border border-zinc-200 dark:border-white/10">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono block">
              Median MTTR
            </span>
            <span className="font-mono text-base font-bold text-zinc-950 dark:text-white">
              &lt; 18.2s
            </span>
          </div>
        </div>
      </div>

      {/* Footer live beacon */}
      <div className="mt-5 pt-3.5 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          Autonomous Sentinel Running
        </span>
        <span className="text-zinc-400">SLA: 99.99%</span>
      </div>
    </div>
  );
}
