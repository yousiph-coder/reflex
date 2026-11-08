// src/app/api/ux-ai/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  AUTOHEAL_PRODUCT_DATA,
  RUNTIME_PROMPTS,
  ContextualHelpResponse,
  OnboardingAgentResponse,
  SmartSearchResponse,
  AdaptiveUIConfig,
} from "@/lib/ux-ai-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, payload } = body;

    // 1. CONTEXTUAL HELP MODE
    if (mode === "contextual_help") {
      const ctx = payload.context;
      const systemPrompt = RUNTIME_PROMPTS.contextualHelp(JSON.stringify(ctx));

      const llmResult = await tryOpenAI<ContextualHelpResponse>(systemPrompt);
      if (llmResult) return NextResponse.json(llmResult);

      // Deterministic Context-Aware Fallback
      const label = ctx?.element?.label || "Control";
      const err = ctx?.element?.errorText;
      if (err) {
        return NextResponse.json({
          title: "Workspace Permission Sync Needed",
          tooltip: "Your active session needs owner binding for this workspace.",
          expanded_help: `The request returned "${err.slice(0, 60)}". Click Manual Sync (ID: 168046767) or switch to your primary workspace.`,
          suggested_action: "Run Manual Sync (168046767)",
          confidence: "high",
        } satisfies ContextualHelpResponse);
      }

      return NextResponse.json({
        title: label.slice(0, 38),
        tooltip: `Directly controls ${label.toLowerCase()} inside ${ctx?.page?.sectionName || "your workspace"}.`,
        expanded_help:
          ctx?.element?.nearbyText?.slice(0, 130) ||
          "Triggers the verification pipeline without touching your production branch directly.",
        suggested_action: ctx?.element?.buttonText
          ? `Click "${ctx.element.buttonText}" to proceed`
          : "Inspect live telemetry state",
        confidence: "high",
      } satisfies ContextualHelpResponse);
    }

    // 2. ONBOARDING AGENT MODE
    if (mode === "onboarding_agent") {
      const goal: string = (payload.goal || "Fix my first production bug automatically").slice(0, 120);
      const completedIds: string[] = payload.completedSteps || [];

      const prompt = RUNTIME_PROMPTS.onboardingAgent(
        "AutoHeal AI Autonomous SRE Platform",
        goal,
        JSON.stringify(AUTOHEAL_PRODUCT_DATA.routes),
        JSON.stringify({ completedIds, plan: payload.plan || "free" })
      );

      const llmResult = await tryOpenAI<OnboardingAgentResponse>(prompt);
      if (llmResult) return NextResponse.json(llmResult);

      const isSentryGoal = goal.toLowerCase().includes("sentry") || goal.toLowerCase().includes("webhook");
      const isPrGoal = goal.toLowerCase().includes("pr") || goal.toLowerCase().includes("review");

      const steps = [
        {
          title: "Sync GitHub App Installation (#168046767)",
          description: "Link yousiph-coder/Vireon so the sandbox can read stack traces and open branches.",
          why_it_matters: "Gives the engine least-privilege read/write access to create verified PRs.",
          action_label: "Sync Repository",
          action_target: "/dashboard/repositories",
          status: completedIds.includes("step-1") ? ("completed" as const) : ("in_progress" as const),
          priority: "high" as const,
        },
        {
          title: "Attach Sentry Error Stream Webhook",
          description: "Paste your workspace webhook URL into Sentry -> Settings -> Webhooks.",
          why_it_matters: "Captures unhandled exceptions the second they occur in production.",
          action_label: "Copy Webhook URL",
          action_target: "/dashboard/setup",
          status: completedIds.includes("step-2") ? ("completed" as const) : ("not_started" as const),
          priority: isSentryGoal ? ("high" as const) : ("medium" as const),
        },
        {
          title: "Verify & Merge Your First Autonomous Fix",
          description: "Inspect the side-by-side diff verified in Docker before merging into main.",
          why_it_matters: "Confirms the patch passes all unit tests with zero regressions.",
          action_label: "Open Incident Explorer",
          action_target: "/dashboard/incidents",
          status: completedIds.includes("step-3") ? ("completed" as const) : ("not_started" as const),
          priority: isPrGoal ? ("high" as const) : ("medium" as const),
        },
      ];

      return NextResponse.json({
        welcome_message: "Let's wire your autonomous remediation loop.",
        summary: `Configured the fastest 3-step path for: "${goal}".`,
        steps,
        primary_cta: {
          label: "Sync GitHub Repo Now",
          action: "/dashboard/repositories",
        },
        fallback_message: "Using standard production setup path for your workspace.",
      } satisfies OnboardingAgentResponse);
    }

    // 3. ADAPTIVE UI MODE
    if (mode === "adaptive_ui") {
      const intent: string = payload.intent || "triage_crashes";
      const prompt = RUNTIME_PROMPTS.adaptiveUI(
        JSON.stringify(AUTOHEAL_PRODUCT_DATA),
        intent,
        "JSON matching AdaptiveUIConfig schema"
      );

      const llmResult = await tryOpenAI<AdaptiveUIConfig>(prompt);
      if (llmResult) return NextResponse.json(llmResult);

      const presets: Record<string, AdaptiveUIConfig> = {
        triage_crashes: {
          mode_title: "Live Incident Triage View",
          priority_metric: { label: "Mean Time To Remediation", value: "38s", delta: "-94% vs manual" },
          highlighted_route: "/dashboard/incidents",
          recommended_actions: [
            {
              title: "Review PR #3 on yousiph-coder/Vireon",
              reason: "TypeError in src/counter.js patched & verified in Docker.",
              route: "/dashboard/incidents",
              badge: "VERIFIED FIX",
            },
            {
              title: "Trigger Live E2E Smoke Exception",
              reason: "Test webhook latency against current active branch.",
              route: "/dashboard/setup",
              badge: "SMOKE TEST",
            },
          ],
          visible_widgets: ["live_sandbox", "recent_prs", "sentry_health"],
        },
        connect_infra: {
          mode_title: "Repository & Webhook Wiring View",
          priority_metric: { label: "Connected Installations", value: "ID #168046767", delta: "GitHub App Active" },
          highlighted_route: "/dashboard/repositories",
          recommended_actions: [
            {
              title: "Sync GitHub App Repositories",
              reason: "Pull latest branches from installation 168046767.",
              route: "/dashboard/repositories",
              badge: "SYNC READY",
            },
            {
              title: "Configure Sentry Webhook Secret",
              reason: "Ensure incoming payloads are HMAC-verified.",
              route: "/dashboard/setup",
              badge: "SECURITY",
            },
          ],
          visible_widgets: ["sentry_health", "live_sandbox"],
        },
        executive_roi: {
          mode_title: "Founder ROI & Engineering Savings View",
          priority_metric: { label: "Engineering Hours Saved", value: "18.5 hrs", delta: "~$1,110 saved this month" },
          highlighted_route: "/dashboard/billing",
          recommended_actions: [
            {
              title: "Inspect Monthly Auto-Heal Quota (3/5 Free Used)",
              reason: "2 free autonomous heals remaining before paywall lock.",
              route: "/dashboard/billing",
              badge: "3/5 USED",
            },
            {
              title: "Unlock Unlimited Pro Remediations ($29/mo)",
              reason: "Remove the 5-heal cap for uninterrupted 24/7 protection.",
              route: "/dashboard/billing",
              badge: "PRO TIER",
            },
          ],
          visible_widgets: ["roi_calculator", "recent_prs"],
        },
      };

      return NextResponse.json(presets[intent] || presets.triage_crashes);
    }

    // 4. SMART SEARCH MODE
    if (mode === "smart_search") {
      const query: string = (payload.query || "").trim();
      const prompt = RUNTIME_PROMPTS.smartSearch(
        "AutoHeal AI SaaS",
        query,
        JSON.stringify(AUTOHEAL_PRODUCT_DATA),
        JSON.stringify({ plan: payload.plan || "free" })
      );

      const llmResult = await tryOpenAI<SmartSearchResponse>(prompt);
      if (llmResult) return NextResponse.json(llmResult);

      const q = query.toLowerCase();
      const scored = AUTOHEAL_PRODUCT_DATA.routes
        .map((r) => {
          let score = 0;
          if (r.title.toLowerCase().includes(q)) score += 5;
          if (r.description.toLowerCase().includes(q)) score += 3;
          r.keywords.forEach((k) => {
            if (q.includes(k) || k.includes(q)) score += 4;
          });
          return { route: r, score };
        })
        .sort((a, b) => b.score - a.score);

      const topMatches = scored.filter((item) => item.score > 0).slice(0, 6);
      const finalMatches = (topMatches.length > 0 ? topMatches : scored.slice(0, 3)).map((item) => ({
        title: item.route.title,
        description: item.route.description,
        type: item.route.type,
        url: item.route.url,
        reason:
          item.score > 0
            ? `Directly matches your request regarding "${query}".`
            : "Closest core workflow available in your workspace.",
        action_label: `Open ${item.route.title.split(" ")[0]}`,
      }));

      return NextResponse.json({
        interpreted_intent: query
          ? `Navigate to or configure: "${query}"`
          : "Browse core workspace capabilities",
        answer:
          topMatches.length > 0
            ? `Found ${topMatches.length} matching workflow(s) inside your workspace.`
            : "No exact keyword match—showing the closest setup and remediation routes.",
        results: finalMatches,
        suggested_actions: [
          { label: "Sync GitHub App (#168046767)", target: "/dashboard/repositories" },
          { label: "Inspect PR #3 Diff", target: "/dashboard/incidents" },
        ],
        related_searches: [
          "How do I set up my first project?",
          "Where do I change my billing?",
          "Sync GitHub repository Vireon",
        ],
        confidence: topMatches.length > 0 ? "high" : "medium",
      } satisfies SmartSearchResponse);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function tryOpenAI<T>(systemPrompt: string): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return content ? (JSON.parse(content) as T) : null;
  } catch {
    return null;
  }
}
