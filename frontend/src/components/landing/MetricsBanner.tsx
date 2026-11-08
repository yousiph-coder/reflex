"use client";

import { Clock, Lock, ShieldAlert, Sparkles, TrendingDown, Zap } from "lucide-react";

export function MetricsBanner() {
  const metrics = [
    {
      stat: "70%+",
      label: "MTTR Reduction",
      description: "Average Mean Time To Remediate drops from 4.2 hours to under 20 seconds.",
      icon: TrendingDown,
      color: "text-emerald-500 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      glowStyle: "drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]",
    },
    {
      stat: "Zero",
      label: "PII Leaks Guaranteed",
      description: "Deterministic entropy and regex scrubbers strip secrets before any LLM sees tokens.",
      icon: Lock,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      glowStyle: "drop-shadow-[0_0_12px_rgba(168,85,247,0.35)]",
    },
    {
      stat: "100%",
      label: "Ephemeral Isolation",
      description: "Docker sandbox runs without network access and with dropped Linux capabilities.",
      icon: ShieldAlert,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      glowStyle: "drop-shadow-[0_0_12px_rgba(6,182,212,0.35)]",
    },
    {
      stat: "95.8%",
      label: "First-Pass Pass Rate",
      description: "Verified fixes compile and pass existing test suites before any pull request is opened.",
      icon: Zap,
      color: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      glowStyle: "drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]",
    },
  ];

  return (
    <section id="metrics" className="py-16 border-y border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs uppercase font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
            Engineered For Reliability & Enterprise SLA
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Proven Performance at Cloud Scale
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl liquid-glass border border-zinc-200 dark:border-white/10 hover:border-emerald-500/40 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl border ${item.bgColor} ${item.borderColor} ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
                      SLA Guaranteed
                    </span>
                  </div>

                  <div className={`text-4xl font-extrabold font-mono tracking-tight mb-2 ${item.color} ${item.glowStyle}`}>
                    {item.stat}
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5 font-mono">
                    {item.label}
                  </h3>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-white/10 flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow-emerald" />
                  <span>Real-time benchmark</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
