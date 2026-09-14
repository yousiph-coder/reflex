"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Hash, Radio, Webhook } from "lucide-react";

export function WebhookGuide() {
  const [activeTab, setActiveTab] = useState<"sentry" | "datadog" | "slack">("sentry");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const SENTRY_URL = "https://api.autoheal.ai/api/v1/webhooks/sentry";
  const SENTRY_CURL = `curl -X POST "${SENTRY_URL}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -d '{
    "action": "created",
    "data": {
      "issue": { "id": "1001", "title": "KeyError in auth.py" },
      "event": {
        "title": "KeyError: user_id",
        "platform": "python",
        "environment": "production",
        "entries": []
      }
    }
  }'`;

  const SLACK_SAMPLE = `{
  "slack_webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX",
  "discord_webhook_url": "https://discord.com/api/webhooks/0000/XXXX"
}`;

  return (
    <div className="p-6 rounded-xl border border-zinc-800 bg-[#121215] space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Webhook className="w-4 h-4 text-purple-400" />
          Inbound Webhook & Channel Setup Guide
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Connect your crash telemetry sources and notification channels directly into AutoHeal AI.
        </p>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-zinc-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab("sentry")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "sentry"
              ? "border-emerald-400 text-white font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-rose-400" />
          Sentry Integration
        </button>

        <button
          onClick={() => setActiveTab("datadog")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "datadog"
              ? "border-emerald-400 text-white font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-purple-400" />
          Datadog Monitors
        </button>

        <button
          onClick={() => setActiveTab("slack")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "slack"
              ? "border-emerald-400 text-white font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Hash className="w-3.5 h-3.5 text-emerald-400" />
          Slack & Discord Alerts
        </button>
      </div>

      {/* ── TAB 1: Sentry ────────────────────────────────────────── */}
      {activeTab === "sentry" && (
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="font-semibold text-white block">Step 1: Configure Sentry Webhook Endpoint</span>
            <p className="text-zinc-400">
              In your Sentry Project settings, navigate to <span className="text-zinc-200 font-mono">Alerts &gt; Webhooks</span> or <span className="text-zinc-200 font-mono">Integrations &gt; Webhooks</span> and paste the following endpoint URL:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={SENTRY_URL}
                className="flex-1 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 font-mono text-xs text-emerald-400"
              />
              <button
                onClick={() => copyToClipboard(SENTRY_URL, "sentry-url")}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1.5"
              >
                {copiedKey === "sentry-url" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="font-semibold text-white block">Step 2: Add Custom Authentication Header</span>
            <p className="text-zinc-400">
              Add a custom HTTP header in Sentry’s webhook settings with your organization’s active secret:
            </p>
            <pre className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300">
              X-API-Key: ah_live_your_secret_key_here
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-zinc-300">Test Simulation Command (cURL)</span>
              <button
                onClick={() => copyToClipboard(SENTRY_CURL, "sentry-curl")}
                className="text-zinc-500 hover:text-white flex items-center gap-1"
              >
                {copiedKey === "sentry-curl" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy cURL
              </button>
            </div>
            <pre className="p-3.5 rounded-lg bg-[#09090b] border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre">
              {SENTRY_CURL}
            </pre>
          </div>
        </div>
      )}

      {/* ── TAB 2: Datadog ───────────────────────────────────────── */}
      {activeTab === "datadog" && (
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="font-semibold text-white block">Datadog Monitor Webhook Target</span>
            <p className="text-zinc-400">
              Create a custom webhook in Datadog under <span className="text-zinc-200 font-mono">Integrations &gt; Webhooks</span> with custom payload matching the incident telemetry schema:
            </p>
            <pre className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre">
{`URL: https://api.autoheal.ai/api/v1/webhooks/sentry
Payload: {
  "action": "created",
  "data": {
    "issue": { "id": "$ALERT_ID", "title": "$EVENT_TITLE" },
    "event": { "title": "$EVENT_MSG", "platform": "python", "environment": "production" }
  }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* ── TAB 3: Slack & Discord ──────────────────────────────── */}
      {activeTab === "slack" && (
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="font-semibold text-white block">Real-Time Channel Dispatcher</span>
            <p className="text-zinc-400">
              AutoHeal automatically formats and pushes rich messages with direct GitHub Pull Request buttons to your configured channels:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pt-1">
              <li><strong className="text-white">Slack:</strong> Formatted with Block Kit, interactive PR buttons, and status color bars.</li>
              <li><strong className="text-white">Discord:</strong> Formatted with high-resolution Embeds and green verification badges.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="font-semibold text-white block">Backend Configuration (`.env`)</span>
            <pre className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300">
{`SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
