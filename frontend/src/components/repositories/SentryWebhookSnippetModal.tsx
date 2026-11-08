"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Radio, Shield, Terminal, X } from "lucide-react";
import { Repository } from "@/lib/types";

interface SentryWebhookSnippetModalProps {
  repo: Repository | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SentryWebhookSnippetModal({
  repo,
  isOpen,
  onClose,
}: SentryWebhookSnippetModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!isOpen || !repo) return null;

  const mapping = repo.sentry_mappings?.[0];
  const webhookUrl = "https://api.autoheal.ai/api/v1/webhooks/sentry";

  const samplePayload = `{
  "action": "created",
  "data": {
    "issue": {
      "id": "ISSUE-ERR-9842",
      "title": "KeyError: 'user_id' in get_current_user",
      "project": {
        "slug": "${mapping?.project_slug || repo.name}",
        "name": "${mapping?.project_slug || repo.name}"
      },
      "metadata": {
        "type": "KeyError",
        "value": "'user_id'",
        "filename": "${repo.language === "Python" ? "app/services/auth.py" : "src/auth/service.ts"}"
      }
    }
  }
}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(samplePayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-mono text-zinc-900 dark:text-white">
                Sentry Webhook Setup Instructions
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Forward error alerts from Sentry project into AutoHeal AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-zinc-600 dark:text-zinc-300">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 font-mono">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              <span>In Sentry: Configure Webhook Alert Action</span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 pl-7 leading-relaxed">
              Go to your Sentry organization ({mapping?.organization_slug || "yousiph-sre"}) →{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Settings</strong> → <strong className="text-zinc-800 dark:text-zinc-200">Developer Settings</strong> →{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Internal Integrations</strong> (or <strong className="text-zinc-800 dark:text-zinc-200">Alerts → Rules</strong>).
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 font-mono">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              <span>Set Target Webhook URL</span>
            </div>
            <div className="pl-7">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10 font-mono text-[11px] text-purple-700 dark:text-purple-300">
                <span className="flex-1 truncate">{webhookUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 rounded-lg liquid-glass border border-zinc-300 dark:border-white/10 hover:border-purple-500/40 text-zinc-800 dark:text-white font-mono text-xs flex items-center gap-1.5 transition-all"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 font-mono">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">
                3
              </span>
              <span>Enable Webhook Permissions</span>
            </div>
            <div className="pl-7 space-y-1 text-zinc-500 dark:text-zinc-400">
              <p>• Grant <strong className="text-zinc-800 dark:text-zinc-200">Issue & Event: Read</strong> permission.</p>
              <p>• Check the <strong className="text-zinc-800 dark:text-zinc-200">issue</strong> trigger checkbox under Webhooks.</p>
              <p>• AutoHeal verifies incoming HMAC signatures automatically.</p>
            </div>
          </div>

          {/* Sample Payload Preview */}
          <div className="pt-2 pl-7 space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Sample Intercepted Sentry Event</span>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 text-[11px] transition-colors"
              >
                {copiedPayload ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedPayload ? "Copied JSON" : "Copy JSON"}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-zinc-950 dark:bg-black border border-zinc-800 dark:border-white/10 font-mono text-[10px] text-zinc-300 overflow-x-auto shadow-inner">
              {samplePayload}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] flex justify-end font-mono">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl liquid-glass border border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20 text-zinc-800 dark:text-white font-medium text-xs transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
