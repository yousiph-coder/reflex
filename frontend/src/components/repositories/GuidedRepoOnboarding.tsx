"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GuidedRepoOnboardingProps {
  githubAppUrl: string;
  hasRepos: boolean;
  onOpenSentryGuide: () => void;
  onTriggerSmokeTest: () => Promise<void>;
  isSmokeTesting: boolean;
}

export function GuidedRepoOnboarding({
  githubAppUrl,
  hasRepos,
  onOpenSentryGuide,
  onTriggerSmokeTest,
  isSmokeTesting,
}: GuidedRepoOnboardingProps) {
  const [testSuccess, setTestSuccess] = useState(false);

  const handleTestClick = async () => {
    await onTriggerSmokeTest();
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 5000);
  };

  const steps = [
    {
      num: "01",
      title: "Install GitHub App",
      desc: "Grant repository read/write access so AutoHeal can inspect stack trace locations and open validated pull requests.",
      done: hasRepos,
      action: (
        <a
          href={githubAppUrl}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all font-mono"
        >
          <span>Install GitHub App</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ),
    },
    {
      num: "02",
      title: "Configure Sentry Webhook",
      desc: "Forward crash events with HMAC-SHA256 signatures to our webhook ingestion endpoint. AutoHeal automatically strips PII.",
      done: hasRepos,
      action: (
        <button
          type="button"
          onClick={onOpenSentryGuide}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 hover:border-purple-500/50 text-xs font-mono font-medium text-zinc-800 dark:text-white transition-all"
        >
          <Radio className="w-3.5 h-3.5 text-purple-400" />
          <span>Webhook Setup Guide</span>
        </button>
      ),
    },
    {
      num: "03",
      title: "Trigger Live Smoke Test",
      desc: "Simulate an unhandled Python / TypeScript exception to verify the closed-loop Docker sandbox runner and automated PR opening.",
      done: testSuccess,
      action: (
        <button
          type="button"
          onClick={handleTestClick}
          disabled={isSmokeTesting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 font-mono"
        >
          {isSmokeTesting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{isSmokeTesting ? "Running Simulation..." : "Trigger Smoke Test"}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 sm:p-8 rounded-3xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold shadow-glow-emerald mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guided 1-2-3 Setup</span>
          </div>
          <h2 className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
            Get Started with Autonomous Healing
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-0.5 leading-relaxed">
            Follow these 3 quick steps to activate closed-loop error interception and automated pull requests.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((step) => (
          <div
            key={step.num}
            className={cn(
              "p-5 rounded-2xl liquid-glass border transition-all flex flex-col justify-between space-y-4",
              step.done
                ? "border-emerald-500/30 bg-emerald-500/5 shadow-glow-emerald"
                : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                  STEP {step.num}
                </span>
                {step.done ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Complete
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-400">Pending</span>
                )}
              </div>

              <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                {step.title}
              </h3>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                {step.desc}
              </p>
            </div>

            <div className="pt-2">{step.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
