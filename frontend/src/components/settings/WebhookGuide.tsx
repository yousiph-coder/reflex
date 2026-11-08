"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Hash,
  Loader2,
  Radio,
  Save,
  Webhook,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";

export function WebhookGuide() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"sentry" | "datadog" | "slack">("sentry");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Slack & Discord notification state
  const [discordUrl, setDiscordUrl] = useState("");
  const [slackUrl, setSlackUrl] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingTarget, setTestingTarget] = useState<"discord" | "slack" | null>(null);

  // Fetch saved notification webhook URLs on mount
  useEffect(() => {
    let isMounted = true;
    async function loadNotificationSettings() {
      setIsLoadingSettings(true);
      try {
        const data = await apiClient.getNotificationSettings();
        if (isMounted) {
          setDiscordUrl(data.discord_webhook_url || "");
          setSlackUrl(data.slack_webhook_url || "");
          setAlertsEnabled(data.alerts_enabled ?? true);
        }
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    }
    loadNotificationSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveAlertSettings = async () => {
    setIsSaving(true);
    try {
      const updated = await apiClient.updateNotificationSettings({
        discord_webhook_url: discordUrl.trim() || null,
        slack_webhook_url: slackUrl.trim() || null,
        alerts_enabled: alertsEnabled,
      });
      setDiscordUrl(updated.discord_webhook_url || "");
      setSlackUrl(updated.slack_webhook_url || "");
      setAlertsEnabled(updated.alerts_enabled ?? true);
      toast.success("Notification channels saved.");
    } catch (err: any) {
      toast.error("Failed to save settings", err?.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestAlert = async (type: "discord" | "slack") => {
    const url = type === "discord" ? discordUrl.trim() : slackUrl.trim();
    if (!url) {
      toast.warning(
        `Missing ${type === "discord" ? "Discord" : "Slack"} Webhook URL`,
        `Please enter a valid ${type === "discord" ? "Discord" : "Slack"} webhook URL first.`
      );
      return;
    }

    setTestingTarget(type);
    try {
      await apiClient.testNotificationWebhook(url);
      toast.success("Live test alert delivered to your channel!");
    } catch (err: any) {
      toast.error("Live test alert failed", err?.message || "Delivery failed");
    } finally {
      setTestingTarget(null);
    }
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

  return (
    <div className="p-6 rounded-2xl liquid-glass space-y-5 select-none">
      <div>
        <h3 className="text-base font-semibold text-white dark:text-white light:text-zinc-950 flex items-center gap-2 font-mono">
          <Webhook className="w-4 h-4 text-purple-400" />
          Telemetry & Alert Integrations
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1 font-sans leading-relaxed">
          Connect your crash telemetry sources and notification channels directly into AutoHeal AI.
        </p>
      </div>

      {/* ── Tabs (Apple Liquid Glass) ────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 dark:border-white/10 light:border-zinc-200 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("sentry")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "sentry"
              ? "border-emerald-400 text-white dark:text-white light:text-zinc-950 font-semibold"
              : "border-transparent text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white"
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-rose-400" />
          Sentry Integration
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("datadog")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "datadog"
              ? "border-emerald-400 text-white dark:text-white light:text-zinc-950 font-semibold"
              : "border-transparent text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-purple-400" />
          Datadog Monitors
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("slack")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "slack"
              ? "border-emerald-400 text-white dark:text-white light:text-zinc-950 font-semibold"
              : "border-transparent text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white"
          }`}
        >
          <Hash className="w-3.5 h-3.5 text-emerald-400 glow-emerald" />
          # Slack & Discord Alerts
        </button>
      </div>

      {/* ── TAB 1: Sentry ────────────────────────────────────────── */}
      {activeTab === "sentry" && (
        <div className="space-y-4 text-xs font-sans">
          <div className="p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-2">
            <span className="font-semibold text-white dark:text-white light:text-zinc-950 block font-mono">
              Step 1: Configure Sentry Webhook Endpoint
            </span>
            <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed">
              In your Sentry Project settings, navigate to{" "}
              <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-800 font-mono px-1 py-0.5 rounded bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200">
                Alerts &gt; Webhooks
              </span>{" "}
              or{" "}
              <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-800 font-mono px-1 py-0.5 rounded bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200">
                Integrations &gt; Webhooks
              </span>{" "}
              and paste the following endpoint URL:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={SENTRY_URL}
                className="flex-1 px-3 py-2 rounded-xl bg-black/40 dark:bg-black/40 light:bg-white border border-white/10 dark:border-white/10 light:border-zinc-300 font-mono text-xs text-emerald-400 glow-emerald"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(SENTRY_URL, "sentry-url")}
                className="px-3.5 py-2 rounded-xl bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200 hover:bg-white/[0.1] text-white dark:text-white light:text-zinc-900 border border-white/10 dark:border-white/10 light:border-zinc-300 flex items-center gap-1.5 font-mono"
              >
                {copiedKey === "sentry-url" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-2">
            <span className="font-semibold text-white dark:text-white light:text-zinc-950 block font-mono">
              Step 2: Add Custom Authentication Header
            </span>
            <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed">
              Add a custom HTTP header in Sentry’s webhook settings with your organization’s active secret:
            </p>
            <pre className="p-3 rounded-xl bg-black/40 dark:bg-black/40 light:bg-zinc-900 border border-white/10 dark:border-white/10 light:border-zinc-300 font-mono text-[11px] text-zinc-300">
              X-API-Key: ah_live_your_secret_key_here
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 font-mono">
              <span className="font-medium text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
                Test Simulation Command (cURL)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(SENTRY_CURL, "sentry-curl")}
                className="text-zinc-500 hover:text-white flex items-center gap-1 text-xs"
              >
                {copiedKey === "sentry-curl" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy cURL
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-black/60 dark:bg-black/60 light:bg-zinc-950 border border-white/10 dark:border-white/10 light:border-zinc-300 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed">
              {SENTRY_CURL}
            </pre>
          </div>
        </div>
      )}

      {/* ── TAB 2: Datadog ───────────────────────────────────────── */}
      {activeTab === "datadog" && (
        <div className="space-y-4 text-xs font-sans">
          <div className="p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-2">
            <span className="font-semibold text-white dark:text-white light:text-zinc-950 block font-mono">
              Datadog Monitor Webhook Target
            </span>
            <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed">
              Create a custom webhook in Datadog under{" "}
              <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-800 font-mono px-1 py-0.5 rounded bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-200">
                Integrations &gt; Webhooks
              </span>{" "}
              with custom payload matching the incident telemetry schema:
            </p>
            <pre className="p-3 rounded-xl bg-black/60 dark:bg-black/60 light:bg-zinc-950 border border-white/10 dark:border-white/10 light:border-zinc-300 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed">
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

      {/* ── TAB 3: # Slack & Discord Alerts ────────────────────────── */}
      {activeTab === "slack" && (
        <div className="space-y-5 text-xs font-sans">
          {isLoadingSettings ? (
            <div className="p-8 rounded-xl bg-white/[0.02] dark:bg-white/[0.02] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 flex items-center justify-center gap-3 text-zinc-400 font-mono text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              Loading saved notification channels...
            </div>
          ) : (
            <>
              {/* Dispatcher status & toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200">
                <div>
                  <span className="font-semibold text-white dark:text-white light:text-zinc-950 block font-mono">
                    Real-Time Alert Dispatchers (Slack & Discord)
                  </span>
                  <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed text-xs mt-0.5">
                    AutoHeal automatically formats and pushes rich remediation notifications whenever a Pull Request is verified & created.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 px-3.5 py-1.5 rounded-xl border border-white/10 dark:border-white/10 light:border-zinc-200 shrink-0">
                  <span className="text-xs font-mono text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
                    Alert Dispatching
                  </span>
                  <button
                    type="button"
                    onClick={() => setAlertsEnabled((prev) => !prev)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      alertsEnabled ? "bg-emerald-500 glow-emerald" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        alertsEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Input 1: Discord Channel Webhook URL */}
              <div className="p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white dark:text-white light:text-zinc-950 flex items-center gap-2 font-mono">
                    <Radio className="w-3.5 h-3.5 text-indigo-400" />
                    Discord Channel Webhook URL
                    <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-sans hidden sm:inline">
                      (Rich 0x10B981 Embeds with PR Link & MTTR)
                    </span>
                  </label>
                  <a
                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 flex items-center gap-1 transition-colors font-mono"
                  >
                    Docs <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-zinc-950 dark:text-white font-mono text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendTestAlert("discord")}
                    disabled={testingTarget === "discord" || !discordUrl.trim()}
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-white/10 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {testingTarget === "discord" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <span>⚡</span>
                    )}
                    Send Live Test Alert
                  </button>
                </div>
              </div>

              {/* Input 2: Slack Incoming Webhook URL */}
              <div className="p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white dark:text-white light:text-zinc-950 flex items-center gap-2 font-mono">
                    <Hash className="w-3.5 h-3.5 text-emerald-400 glow-emerald" />
                    Slack Incoming Webhook URL
                    <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-sans hidden sm:inline">
                      (Interactive Block Kit buttons with PR Review)
                    </span>
                  </label>
                  <a
                    href="https://api.slack.com/messaging/webhooks"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 flex items-center gap-1 transition-colors font-mono"
                  >
                    Docs <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-zinc-950 dark:text-white font-mono text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendTestAlert("slack")}
                    disabled={testingTarget === "slack" || !slackUrl.trim()}
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-white/10 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {testingTarget === "slack" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <span>⚡</span>
                    )}
                    Send Live Test Alert
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <span className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-mono">
                  Changes apply instantly to incoming incident remediations.
                </span>
                <button
                  type="button"
                  onClick={handleSaveAlertSettings}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 glow-emerald"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Alert Settings
                </button>
              </div>

              {/* ── Live Preview Box (3:00 AM Remediation Simulation) ── */}
              <div className="rounded-xl border border-white/10 dark:border-white/10 light:border-zinc-300 bg-black/40 dark:bg-black/40 light:bg-zinc-50 p-4 space-y-3 font-sans">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-zinc-200 dark:text-zinc-200 light:text-zinc-800 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 glow-emerald" />
                    Live Remediation Alert Preview (3:00 AM Simulation)
                  </div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-mono">
                    Simulated Webhook Dispatch
                  </span>
                </div>

                {/* Simulated Notification Message */}
                <div className="rounded-xl border-l-4 border-l-emerald-500 border border-white/10 dark:border-white/10 light:border-zinc-300 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 dark:text-rose-400 light:text-rose-600">
                        🚨 TypeError in src/counter.js
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 light:text-zinc-400">→</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 dark:text-emerald-400 light:text-emerald-700">
                        ✅ PR #3 Ready for Merge
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-400 light:text-zinc-500">
                      Today at 03:00:14 AM
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                    <div className="p-2.5 rounded-lg bg-black/40 dark:bg-black/40 light:bg-zinc-50 border border-white/5 dark:border-white/5 light:border-zinc-200">
                      <span className="text-zinc-400 dark:text-zinc-400 light:text-zinc-500 block text-[10px] uppercase font-semibold">
                        Repository
                      </span>
                      <span className="text-white dark:text-white light:text-zinc-950 font-medium">
                        yousiph-coder/Vireon
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 dark:bg-black/40 light:bg-zinc-50 border border-white/5 dark:border-white/5 light:border-zinc-200">
                      <span className="text-zinc-400 dark:text-zinc-400 light:text-zinc-500 block text-[10px] uppercase font-semibold">
                        Sandbox Result
                      </span>
                      <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-medium">
                        14/14 Tests Passed (38s MTTR)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 dark:bg-black/40 light:bg-zinc-50 border border-white/5 dark:border-white/5 light:border-zinc-200">
                      <span className="text-zinc-400 dark:text-zinc-400 light:text-zinc-500 block text-[10px] uppercase font-semibold">
                        Engineering Saved
                      </span>
                      <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-medium">
                        2.5 hrs saved (~$163)
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                      Branch:{" "}
                      <span className="text-zinc-200 dark:text-zinc-200 light:text-zinc-800">
                        autoheal/fix-counter-3
                      </span>
                    </span>
                    <a
                      href="https://github.com/yousiph-coder/Vireon/pull/3"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-semibold hover:bg-emerald-500/20 transition-colors"
                    >
                      <span>View Pull Request #3 on GitHub</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
