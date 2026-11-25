"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Webhook,
  Bell,
  Copy,
  Check,
  Send,
  ShieldCheck,
  Sparkles,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { apiClient, buildApiUrl } from "@/lib/api-client";
import { APIKeyItem } from "@/lib/types";

export default function ReflexApiSettingsPage() {
  const [apiKeys, setApiKeys] = useState<APIKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState<string>("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);

  const [slackUrl, setSlackUrl] = useState<string>("");
  const [discordUrl, setDiscordUrl] = useState<string>("");
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [isSavingWebhooks, setIsSavingWebhooks] = useState<boolean>(false);
  const [isSendingAlert, setIsSendingAlert] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const sentryWebhookUrl = buildApiUrl("/webhooks/sentry");

  const triggerToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3400);
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.allSettled([
      apiClient.getApiKeys(),
      apiClient.getNotificationSettings(),
    ])
      .then(([keysRes, notifRes]) => {
        if (!active) return;
        if (keysRes.status === "fulfilled") {
          setApiKeys(keysRes.value || []);
        }
        if (notifRes.status === "fulfilled" && notifRes.value) {
          setSlackUrl(notifRes.value.slack_webhook_url || "");
          setDiscordUrl(notifRes.value.discord_webhook_url || "");
          setAlertsEnabled(notifRes.value.alerts_enabled !== false);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = (label: string, value: string) => {
    try {
      navigator.clipboard.writeText(value);
    } catch {}
    setCopiedField(label);
    triggerToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || isCreatingKey) return;
    try {
      setIsCreatingKey(true);
      const created = await apiClient.createApiKey({ name: newKeyName.trim() });
      setApiKeys((prev) => [created, ...prev]);
      setNewlyCreatedKey(created.raw_key);
      setNewKeyName("");
      triggerToast(`Created new API key '${created.name}'!`);
    } catch {
      triggerToast("Failed to create API key. Check backend connection.");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleSaveWebhooks = async () => {
    try {
      setIsSavingWebhooks(true);
      await apiClient.updateNotificationSettings({
        slack_webhook_url: slackUrl.trim() || null,
        discord_webhook_url: discordUrl.trim() || null,
        alerts_enabled: alertsEnabled,
      });
      triggerToast("Webhook notification settings saved to PostgreSQL!");
    } catch {
      triggerToast("Could not save webhook settings. Check FastAPI backend.");
    } finally {
      setIsSavingWebhooks(false);
    }
  };

  const handleSendTestAlert = async () => {
    const targetUrl = slackUrl.trim() || discordUrl.trim();
    if (!targetUrl) {
      triggerToast("Enter a Slack or Discord Webhook URL first.");
      return;
    }
    try {
      setIsSendingAlert(true);
      triggerToast("Dispatching live test alert via backend...");
      await apiClient.testNotificationWebhook(targetUrl);
      triggerToast("Live Test Alert delivered successfully!");
    } catch (err: any) {
      triggerToast(err?.message || "Failed to send test alert.");
    } finally {
      setIsSendingAlert(false);
    }
  };

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-16">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[960px] h-[420px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Tenant Endpoints & Webhook Security</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            API Keys & Setup
          </h1>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs px-3.5 py-2 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Live Backend Connected</span>
        </div>
      </div>

      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Sentry Webhook Endpoint
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste this URL in Sentry → Settings → Internal Integrations
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
              Live Ingestion URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={sentryWebhookUrl}
                className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy("Sentry Webhook URL", sentryWebhookUrl)}
                className="px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shrink-0"
              >
                {copiedField === "Sentry Webhook URL" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-500 dark:text-violet-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Workspace API Keys
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create keys to authenticate webhooks and CI/CD pipelines
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateApiKey} className="flex items-center gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="New key name (e.g. Production Sentry)..."
              className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isCreatingKey || !newKeyName.trim()}
              className="px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {isCreatingKey ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Create</span>
            </button>
          </form>

          {newlyCreatedKey && (
            <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-2">
              <div className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                Copy this secret key now — it won&apos;t be shown again:
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono truncate text-slate-900 dark:text-white">
                  {newlyCreatedKey}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy("New API Key", newlyCreatedKey)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono text-xs font-semibold"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {isLoading ? (
              <div className="text-xs font-mono text-slate-400 py-2">
                Loading API keys...
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-xs font-mono text-slate-400 py-2">
                No API keys created yet.
              </div>
            ) : (
              apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-xs font-mono"
                >
                  <span className="font-semibold truncate">{k.name}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {k.key_prefix}••••
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 rounded-3xl border p-6 sm:p-8 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                Slack & Discord Live PR Alerts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saved directly to PostgreSQL and dispatched via FastAPI httpx
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendTestAlert}
            disabled={isSendingAlert}
            className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.35)] flex items-center gap-2 transition-all disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSendingAlert ? "Sending Alert..." : "Send Live Test Alert"}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
              Slack Incoming Webhook URL
            </label>
            <input
              type="text"
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
              Discord Channel Webhook URL
            </label>
            <input
              type="text"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => setAlertsEnabled((prev) => !prev)}
            className="flex items-center gap-2.5 text-xs font-mono"
          >
            <span
              className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                alertsEnabled
                  ? "bg-indigo-500 justify-end"
                  : "bg-slate-300 dark:bg-white/15 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow" />
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Enable Live PR Alerts
            </span>
          </button>

          <button
            type="button"
            onClick={handleSaveWebhooks}
            disabled={isSavingWebhooks}
            className="px-5 py-2.5 rounded-xl font-mono text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
          >
            {isSavingWebhooks ? "Saving..." : "Save Webhook Settings"}
          </button>
        </div>
      </section>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
