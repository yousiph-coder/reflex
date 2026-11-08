// src/lib/ux-ai-engine.ts

export interface AIHelpContext {
  page: {
    productName: string;
    currentRoute: string;
    pageTitle: string;
    sectionName: string;
  };
  element: {
    label: string;
    type: string;
    nearbyText: string;
    placeholder: string;
    buttonText: string;
    currentValue: string;
    validationState: string;
    errorText: string;
    emptyStateText: string;
  };
  user: {
    role: string;
    plan: "free" | "pro" | "enterprise";
    deviceType: string;
    recentActions: string[];
  };
  trigger: "hover" | "click" | "error" | "inactivity" | "repeated_failed_attempt" | "time_on_screen";
}

export interface ContextualHelpResponse {
  title: string;
  tooltip: string;
  expanded_help: string;
  suggested_action: string;
  confidence: "high" | "medium" | "low";
}

export interface OnboardingStep {
  title: string;
  description: string;
  why_it_matters: string;
  action_label: string;
  action_target: string;
  status: "not_started" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
}

export interface OnboardingAgentResponse {
  welcome_message: string;
  summary: string;
  steps: OnboardingStep[];
  primary_cta: { label: string; action: string };
  fallback_message: string;
}

export interface SmartSearchResultItem {
  title: string;
  description: string;
  type: "page" | "feature" | "product" | "article" | "template" | "setting" | "action" | "other";
  url: string;
  reason: string;
  action_label: string;
}

export interface SmartSearchResponse {
  interpreted_intent: string;
  answer: string;
  results: SmartSearchResultItem[];
  suggested_actions: { label: string; target: string }[];
  related_searches: string[];
  confidence: "high" | "medium" | "low";
}

export interface AdaptiveUIConfig {
  mode_title: string;
  priority_metric: { label: string; value: string; delta: string };
  highlighted_route: string;
  recommended_actions: { title: string; reason: string; route: string; badge: string }[];
  visible_widgets: ("live_sandbox" | "roi_calculator" | "sentry_health" | "recent_prs")[];
}

// سجل بيانات المنتج الحقيقية فقط (يمنع الذكاء الاصطناعي من اختراع صفحات أو أسعار)
export const AUTOHEAL_PRODUCT_DATA = {
  productName: "AutoHeal AI",
  plans: {
    free: { price: "$0/mo", limit: "5 autonomous heals / month" },
    pro: { price: "$29/mo", limit: "Unlimited autonomous heals, Docker sandbox verification, auto-PRs" },
    enterprise: { price: "Custom", limit: "Dedicated runner clusters, custom SLAs" },
  },
  routes: [
    {
      title: "Overview Command Center",
      url: "/dashboard",
      type: "page" as const,
      description: "Live telemetry, MTTR metrics, repository vitality heart, and active sandbox runs.",
      keywords: ["home", "overview", "metrics", "mttr", "health", "roi", "time saved"],
    },
    {
      title: "Repositories & GitHub App Sync",
      url: "/dashboard/repositories",
      type: "feature" as const,
      description: "Connect GitHub repositories via AutoHeal App (ID: 5193276) and sync installation 168046767.",
      keywords: ["github", "repo", "repository", "sync", "install", "vireon", "connect", "first project"],
    },
    {
      title: "Incident Explorer & Split Diff Viewer",
      url: "/dashboard/incidents",
      type: "feature" as const,
      description: "Inspect Sentry stack traces, collapsible AI diagnosis steps, and side-by-side git patches.",
      keywords: ["incident", "error", "crash", "stack trace", "diff", "pull request", "pr", "merge", "fix"],
    },
    {
      title: "API Keys & Sentry Webhook Setup",
      url: "/dashboard/setup",
      type: "setting" as const,
      description: "Copy your tenant-scoped Sentry webhook URL and trigger a live end-to-end smoke test.",
      keywords: ["sentry", "webhook", "api key", "setup", "onboarding", "token", "integration", "beginner"],
    },
    {
      title: "Plans & Usage Billing",
      url: "/dashboard/billing",
      type: "setting" as const,
      description: "Track your monthly Free tier heals (5/5) or upgrade to Pro ($29/mo) for unlimited fixes.",
      keywords: ["billing", "stripe", "plan", "upgrade", "pro", "free", "limit", "price", "invoice", "402"],
    },
  ],
};

// جامع السياق التلقائي لعنصر الواجهة بدون أي إدخال يدوي من المستخدم
export function getAIHelpContext(
  element: HTMLElement,
  trigger: AIHelpContext["trigger"] = "hover",
  recentActions: string[] = []
): AIHelpContext {
  const sectionEl = element.closest("section, [data-section], main, aside, header");
  const sectionName =
    sectionEl?.getAttribute("data-section") ||
    sectionEl?.querySelector("h1, h2, h3")?.textContent?.trim() ||
    "Main Workspace";

  const errorEl =
    element.closest("[data-error]") ||
    document.querySelector('[role="alert"], .error-banner');

  const inputEl = element as HTMLInputElement;

  return {
    page: {
      productName: "AutoHeal AI",
      currentRoute: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
      pageTitle: typeof document !== "undefined" ? document.title || "AutoHeal SRE" : "AutoHeal SRE",
      sectionName: sectionName.slice(0, 80),
    },
    element: {
      label:
        element.getAttribute("data-help-label") ||
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        element.textContent?.trim().slice(0, 60) ||
        element.tagName.toLowerCase(),
      type: element.getAttribute("data-help-type") || element.tagName.toLowerCase(),
      nearbyText:
        element.parentElement?.textContent?.replace(/\s+/g, " ").trim().slice(0, 140) || "",
      placeholder: inputEl?.placeholder || "",
      buttonText: element.tagName === "BUTTON" || element.tagName === "A" ? element.textContent?.trim().slice(0, 50) || "" : "",
      currentValue: inputEl?.value ? String(inputEl.value).slice(0, 40) : "",
      validationState: element.getAttribute("aria-invalid") === "true" ? "invalid" : "valid",
      errorText: errorEl?.textContent?.trim().slice(0, 120) || "",
      emptyStateText:
        element.closest("[data-empty-state]")?.textContent?.trim().slice(0, 120) || "",
    },
    user: {
      role: "Founder / Lead Engineer",
      plan: (typeof window !== "undefined" && (localStorage.getItem("autoheal_plan") as "free" | "pro")) || "free",
      deviceType: "Desktop (1024px+)",
      recentActions: recentActions.slice(-5),
    },
    trigger,
  };
}

// البرومبتات الأربعة الثابتة كما حددتها حرفياً
export const RUNTIME_PROMPTS = {
  contextualHelp: (contextJson: string) => `You are a contextual help layer inside a digital product.
Replace generic tutorials and static tooltips with short, screen-aware guidance.
You receive a JSON context object. Use only what is provided. Do not ask for missing info. If something is unknown, make the safest useful assumption.
Generate help for the exact element or state the user is focused on.

Return only valid JSON:
{ "title": "Short title", "tooltip": "Under 20 words", "expanded_help": "Under 40 words", "suggested_action": "One short next action", "confidence": "high | medium | low" }

Rules:
- Be specific to the current screen and situation.
- Do not sound like documentation. Do not mention AI.
- Match the user’s level: plain language for beginners, direct and efficient for advanced.
- If the user made an error, explain the fix. If they are hesitating, reduce friction.

Context: ${contextJson}`,

  adaptiveUI: (autoContext: string, userIntent: string, uiRules: string) => `You are an adaptive UI engine inside a digital product.
Generate a personalized UI from the user’s intent, the available product data, and the allowed UI format.
Return only valid JSON.

Context: ${autoContext}
User intent: ${userIntent}
Allowed UI format: ${uiRules}

Rules:
- Use only the provided product data.
- Match the user’s intent to the most relevant available content.
- Follow the predefined UI format. Do not redesign the product.
- Keep the result concise, useful, and scannable.
- If product data is large, use only the relevant subset.
- If there is not enough relevant data, return a helpful fallback state.`,

  onboardingAgent: (
    autoContext: string,
    userGoal: string,
    capabilities: string,
    userState: string
  ) => `You are an onboarding agent inside a digital product.
Create a personalized path that gets the user to their first meaningful outcome as fast as possible.
Use only the provided context, features, routes, and user state.
Do not invent features, pages, integrations, pricing, claims, or actions.
Return only valid JSON.

Context: ${autoContext}
User goal: ${userGoal}
Available capabilities: ${capabilities}
Current user state: ${userState}

Return this JSON:
{
  "welcome_message": "Short personalized welcome",
  "summary": "One sentence explaining the path",
  "steps": [
    {
      "title": "Step title",
      "description": "Short explanation",
      "why_it_matters": "Why this helps",
      "action_label": "Button label",
      "action_target": "Existing route, feature, section, or action",
      "status": "not_started | in_progress | completed",
      "priority": "high | medium | low"
    }
  ],
  "primary_cta": { "label": "CTA label", "action": "CTA action" },
  "fallback_message": "Message if there is not enough context"
}

Rules:
- 3 to 5 steps maximum. Prioritize the fastest path to value.
- Plain language. Do not mention AI. Do not sound like documentation.
- Only recommend features that exist.
- If context is limited, build a useful default path from existing routes and features.`,

  smartSearch: (
    autoContext: string,
    searchQuery: string,
    searchableData: string,
    userContext: string
  ) => `You are a smart search engine inside a digital product.
Understand the user’s natural language query and return a helpful results page using only the provided product data and user context.
Return only valid JSON.

Context: ${autoContext}
Search query: ${searchQuery}
Searchable product data: ${searchableData}
User context: ${userContext}

Return this JSON:
{
  "interpreted_intent": "What the user is trying to do",
  "answer": "Short helpful answer",
  "results": [
    {
      "title": "Result title",
      "description": "Short description",
      "type": "page | feature | product | article | template | setting | action | other",
      "url": "Existing route or URL",
      "reason": "Why this matches",
      "action_label": "CTA label"
    }
  ],
  "suggested_actions": [ { "label": "Suggested action", "target": "Existing route or action" } ],
  "related_searches": [ "Related 1", "Related 2", "Related 3" ],
  "confidence": "high | medium | low"
}

Rules:
- Use only existing product data. Match intent, not just keywords.
- Return at most 8 results, ranked by relevance.
- Keep the answer short. Explain why each result matches.
- If there are no exact matches, show the closest ones plus suggested refinements.
- Do not mention AI. Do not expose internal logic. Do not show results the user cannot access.`,
};
