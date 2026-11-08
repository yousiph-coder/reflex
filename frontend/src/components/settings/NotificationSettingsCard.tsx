"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ExternalLink,
  Hash,
  Loader2,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { NotificationSettings } from "@/lib/types";

export function NotificationSettingsCard() {
  const [settings, setSettings] = useState<NotificationSettings>({
    discord_webhook_url: "",
    slack_webhook_url: "",
    alerts_enabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Testing states
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [testingSlack, setTestingSlack] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await apiClient.getNotificationSettings();
        setSettings({
          discord_webhook_url: data.discord_webhook_url || "",
          slack_webhook_url: data.slack_webhook_url || "",
          alerts_enabled: data.alerts_enabled ?? true,
        });
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await apiClient.updateNotificationSettings({
        discord_webhook_url: settings.discord_webhook_url?.trim() || null,
        slack_webhook_url: settings.slack_webhook_url?.trim() || null,
        alerts_enabled: settings.alerts_enabled,
      });
      setSettings({
        discord_webhook_url: updated.discord_webhook_url || "",
        slack_webhook_url: updated.slack_webhook_url || "",
        alerts_enabled: updated.alerts_enabled ?? true,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save notification settings: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (type: "discord" | "slack") => {
    const url =
      type === "discord"
        ? settings.discord_webhook_url?.trim()
        : settings.slack_webhook_url?.trim();

    if (!url) {
      alert(`Please enter a valid ${type === "discord" ? "Discord" : "Slack"} webhook URL first.`);
      return;
    }

    if (type === "discord") {
      setTestingDiscord(true);
      setDiscordTestResult(null);
    } else {
      setTestingSlack(true);
      setSlackTestResult(null);
    }

    try {
      const res = await apiClient.testNotificationWebhook(url);
      const resultObj = { success: true, message: res.message || "Alert delivered!" };
      if (type === "discord") setDiscordTestResult(resultObj);
      else setSlackTestResult(resultObj);
    } catch (err: any) {
      const resultObj = { success: false, message: err.message || "Delivery failed" };
      if (type === "discord") setDiscordTestResult(resultObj);
      else setSlackTestResult(resultObj);
    } finally {
      if (type === "discord") setTestingDiscord(false);
      else setTestingSlack(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl liquid-glass flex items-center justify-center gap-3 text-zinc-400 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        Loading notification routing channels...
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl liquid-glass space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white dark:text-white light:text-zinc-950 flex items-center gap-2 font-mono">
            <Bell className="w-4 h-4 text-emerald-400 glow-emerald" />
            Real-Time Alert Dispatchers (Slack & Discord)
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1 font-sans leading-relaxed">
            AutoHeal automatically formats and pushes rich remediation notifications whenever a Pull Request is verified & created.
          </p>
        </div>

        {/* Global Alert Toggle */}
        <div className="flex items-center gap-3 bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 px-3.5 py-2 rounded-xl border border-white/10 dark:border-white/10 light:border-zinc-200">
          <span className="text-xs font-mono text-zinc-300 dark:text-zinc-300 light:text-zinc-700">
            Alert Dispatching
          </span>
          <button
            type="button"
            onClick={() =>
              setSettings((prev) => ({ ...prev, alerts_enabled: !prev.alerts_enabled }))
            }
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.alerts_enabled ? "bg-emerald-500 glow-emerald" : "bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.alerts_enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* ── Discord Webhook Field ─────────────────────────────── */}
        <div className="p-4 rounded-xl bg-white/[0.02] dark:bg-white/[0.02] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white dark:text-white light:text-zinc-950 flex items-center gap-2 font-mono">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              Discord Webhook URL
              <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-sans">
                (Rich 0x10B981 Embeds with PR Link & Hours Saved)
              </span>
            </label>
            <a
              href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={settings.discord_webhook_url || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, discord_webhook_url: e.target.value }))
              }
              className="flex-1 px-3 py-2 rounded-xl bg-black/40 dark:bg-black/40 light:bg-white border border-white/10 dark:border-white/10 light:border-zinc-300 font-mono text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => handleTest("discord")}
              disabled={testingDiscord || !settings.discord_webhook_url?.trim()}
              className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testingDiscord ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Test Discord
            </button>
          </div>

          {discordTestResult && (
            <div
              className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                discordTestResult.success
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
              }`}
            >
              {discordTestResult.success ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              )}
              {discordTestResult.message}
            </div>
          )}
        </div>

        {/* ── Slack Webhook Field ───────────────────────────────── */}
        <div className="p-4 rounded-xl bg-white/[0.02] dark:bg-white/[0.02] light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white dark:text-white light:text-zinc-950 flex items-center gap-2 font-mono">
              <Hash className="w-3.5 h-3.5 text-emerald-400 glow-emerald" />
              Slack Incoming Webhook URL
              <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-400 light:text-zinc-500 font-sans">
                (Interactive Block Kit buttons with PR Review)
              </span>
            </label>
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={settings.slack_webhook_url || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, slack_webhook_url: e.target.value }))
              }
              className="flex-1 px-3 py-2 rounded-xl bg-black/40 dark:bg-black/40 light:bg-white border border-white/10 dark:border-white/10 light:border-zinc-300 font-mono text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => handleTest("slack")}
              disabled={testingSlack || !settings.slack_webhook_url?.trim()}
              className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-emerald"
            >
              {testingSlack ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Test Slack
            </button>
          </div>

          {slackTestResult && (
            <div
              className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                slackTestResult.success
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
              }`}
            >
              {slackTestResult.success ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              )}
              {slackTestResult.message}
            </div>
          )}
        </div>

        {/* ── Save Action Bar ──────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 glow-emerald">
              <Check className="w-4 h-4" />
              Notification channels successfully updated!
            </span>
          ) : (
            <span className="text-xs text-zinc-500 font-mono">
              Changes apply instantly to incoming incident remediations.
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 glow-emerald"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Save Notification Settings
          </button>
        </div>
      </form>
    </div>
  );
}
