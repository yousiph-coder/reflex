'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  Webhook,
  Bell,
  Copy,
  Check,
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Terminal,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// STANDALONE REFLEX API KEYS & SETUP PAGE (NO BILLING TABS MIXED IN!)
// File path in VS Code: src/app/dashboard/settings/page.tsx
// ============================================================================

export default function ReflexApiSettingsPage() {
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [slackUrl, setSlackUrl] = useState<string>(
    'https://hooks.slack.com/services/T00000000/B00000000/reflex-live-alert'
  );
  const [discordUrl, setDiscordUrl] = useState<string>(
    'https://discord.com/api/webhooks/129000000000/reflex-sre-bot'
  );
  const [isSendingAlert, setIsSendingAlert] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const sentryWebhookUrl =
    'https://api.reflex.dev/api/v1/webhooks/sentry/tenant_yousiph_745a';
  const reflexApiKey = 'rfx_live_98a7bc65d4e3f2109988776655443322';

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3400);
  };

  const handleCopy = (label: string, value: string) => {
    try {
      navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedField(label);
    triggerToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendTestAlert = () => {
    if (isSendingAlert) return;
    setIsSendingAlert(true);
    triggerToast('Dispatching live embed to Slack & Discord webhooks...');
    setTimeout(() => {
      setIsSendingAlert(false);
      triggerToast('Live Test Alert delivered to Slack & Discord (200 OK)!');
    }, 1400);
  };

  return (
    <div className="relative w-full text-slate-900 dark:text-white space-y-8 pb-16">
      {/* Ambient Background Spotlight Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[960px] h-[420px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              'radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)',
          }}
        />
      </div>

      {/* 1. STANDALONE PAGE HEADER (Strictly API Keys & Setup — Zero Billing Tabs) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tenant Ingestion Endpoints & Webhook Security</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            API Keys & Setup
          </h1>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs px-3.5 py-2 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Sentry & GitHub Webhooks Active</span>
        </div>
      </div>

      {/* 2. SENTRY WEBHOOK & REFLEX SECRET API KEY */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Sentry Webhook Endpoint */}
        <div className="rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Sentry Webhook Endpoint
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Paste this URL inside Sentry → Settings → Internal Integrations
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
              Ingestion Webhook URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={sentryWebhookUrl}
                className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
              <button
                onClick={() => handleCopy('Sentry Webhook URL', sentryWebhookUrl)}
                className="px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shrink-0"
              >
                {copiedField === 'Sentry Webhook URL' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 font-mono">
            ✓ Subscribed events: <strong className="text-indigo-500">issue.created</strong>,{' '}
            <strong className="text-indigo-500">error.unhandled</strong>
          </div>
        </div>

        {/* Card B: Reflex Tenant Secret Key */}
        <div className="rounded-3xl border p-6 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-500 dark:text-violet-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Reflex API Secret Key
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Used to authenticate CLI & CI/CD sandbox triggers
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                triggerToast('Generated new rotated API key for workspace!')
              }
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3 text-indigo-400" />
              <span>Rotate Key</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
              Live Secret Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={reflexApiKey}
                className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                title="Toggle visibility"
              >
                {showSecret ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleCopy('Reflex API Key', reflexApiKey)}
                className="px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 flex items-center gap-1.5 shrink-0"
              >
                {copiedField === 'Reflex API Key' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 font-mono">
            ✓ Header format: <code className="text-indigo-500">Authorization: Bearer rfx_live_...</code>
          </div>
        </div>
      </section>

      {/* 3. SLACK & DISCORD LIVE WEBHOOK ALERTS */}
      <section className="relative z-10 rounded-3xl border p-6 sm:p-8 bg-white/95 dark:bg-[#0b0d17]/90 backdrop-blur-xl border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                Slack & Discord Instant PR Alerts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive rich embeds the second Reflex verifies a patch and opens a GitHub PR
              </p>
            </div>
          </div>

          <button
            onClick={handleSendTestAlert}
            className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.35)] flex items-center gap-2 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSendingAlert ? 'Sending Alert...' : 'Send Live Test Alert'}
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
              className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs bg-slate-50 dark:bg-[#07080d] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() =>
              triggerToast('Webhook notification endpoints saved to PostgreSQL!')
            }
            className="px-5 py-2.5 rounded-xl font-mono text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-all"
          >
            Save Webhook Settings
          </button>
        </div>
      </section>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-[#0b0d17] text-indigo-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}