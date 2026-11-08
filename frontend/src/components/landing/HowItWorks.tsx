"use client";

import {
  ArrowRight,
  CheckCircle,
  Cpu,
  Database,
  FileCode2,
  GitPullRequest,
  Lock,
  MessageSquare,
  ShieldCheck,
  Terminal,
  Webhook,
} from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Capture & Redact",
      tagline: "Instant telemetry ingestion with automated PII scrubbing",
      description:
        "AutoHeal connects directly to your Sentry and Datadog monitors via cryptographic HMAC-SHA256 webhooks. Before any stack trace is stored or analyzed, an aggressive multi-pattern sanitizer strips JWTs, database URLs, API tokens, and user credentials.",
      icon: Webhook,
      color: "text-rose-500 dark:text-rose-400",
      accentBg: "bg-rose-500/10",
      accentBorder: "border-rose-500/20",
      glowClass: "shadow-glow-crimson",
      features: [
        "HMAC-SHA256 signature verification (X-Hub-Signature-256)",
        "Zero-leak secret scrubber (Regex & Shannon entropy)",
        "Distributed Redis debouncing to eliminate alert spam",
      ],
      codeSnippet: `// 1. Inbound Webhook Sanitization
const scrubber = new SecretScrubber();
const cleanEvent = scrubber.scrub(rawSentryEvent);
// "session": "[REDACTED_BEARER_TOKEN]"`,
    },
    {
      step: "02",
      title: "Reason & Sandbox Test",
      tagline: "AST context retrieval and ephemeral container verification",
      description:
        "The agent retrieves the surrounding AST context and recent git blame from GitHub. Using structured reasoning, it produces a minimal unified diff patch. The patch is then immediately applied inside an ephemeral, network-isolated Docker container running the existing test suite.",
      icon: Cpu,
      color: "text-purple-600 dark:text-purple-400",
      accentBg: "bg-purple-500/10",
      accentBorder: "border-purple-500/20",
      glowClass: "shadow-[0_0_15px_rgba(168,85,247,0.35)]",
      features: [
        "GitHub GraphQL API for targeted blame and AST windowing",
        "Ephemeral container runner (512MB RAM, cap_drop=ALL)",
        "Self-healing retry loop: re-feeds test failures to LLM",
      ],
      codeSnippet: `# 2. Isolated Docker Test Execution
pytest tests/test_auth.py --maxfail=1
# Container sandbox status: EXIT_CODE 0
# Assertions pass rate: 100% (5/5 tests)`,
    },
    {
      step: "03",
      title: "Verified Pull Request & Alert",
      tagline: "Atomic GitHub commit and rich multi-channel notification",
      description:
        "Once tests pass with 100% confidence, AutoHeal creates a new branch and commits the fix atomically using the GitHub Git Data API. It opens a detailed Pull Request containing Root Cause Analysis and sends rich alerts to your Slack and Discord channels.",
      icon: GitPullRequest,
      color: "text-emerald-500 dark:text-emerald-400",
      accentBg: "bg-emerald-500/10",
      accentBorder: "border-emerald-500/20",
      glowClass: "shadow-glow-emerald",
      features: [
        "Atomic multi-file commits on isolated branches",
        "Detailed PR description with Root Cause Analysis (RCA)",
        "Interactive Slack Block Kit & Discord Embed notifications",
      ],
      codeSnippet: `// 3. Slack & Discord Dispatch
notifier.dispatchPrOpened({
  prUrl: "https://github.com/org/repo/pull/1",
  status: "PR_OPENED",
  mttrSeconds: 18.2
});`,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-zinc-50/30 dark:bg-black relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 liquid-glass text-zinc-700 dark:text-zinc-300 text-xs font-mono mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow-emerald" />
            <span>Closed-Loop Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            How AutoHeal Resolves Crashes in Under 30 Seconds
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            From unhandled production exception to a sandbox-validated GitHub Pull Request without human intervention.
          </p>
        </div>

        {/* 3-Step Cards */}
        <div className="space-y-8 lg:space-y-12">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            const isReversed = idx % 2 === 1;

            return (
              <div
                key={idx}
                className="rounded-3xl border border-zinc-200 dark:border-white/10 liquid-glass-elevated p-6 sm:p-8 lg:p-10 shadow-2xl hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${isReversed ? "lg:flex-row-reverse" : ""}`}>
                  {/* Left Column: Narrative */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${item.accentBg} ${item.accentBorder} ${item.color} ${item.glowClass}`}>
                        STEP {item.step}
                      </span>
                      <span className="text-xs font-medium font-mono text-zinc-500 uppercase tracking-wider">
                        {item.tagline}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${item.color}`} />
                      {item.title}
                    </h3>

                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-3 space-y-2.5">
                      {item.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                          <CheckCircle className={`w-4 h-4 flex-shrink-0 ${item.color}`} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Code/Log Visualization */}
                  <div className="lg:col-span-5">
                    <div className="rounded-2xl border border-zinc-800 bg-[#000000] overflow-hidden shadow-2xl">
                      <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">
                          stage-{item.step.toLowerCase()}.log
                        </span>
                      </div>
                      <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre">
                        {item.codeSnippet}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
