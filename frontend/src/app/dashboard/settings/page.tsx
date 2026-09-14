"use client";

import { useEffect, useState } from "react";
import { Sliders, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { APIKeyCreated, APIKeyItem } from "@/lib/types";
import { ApiKeyTable } from "@/components/settings/ApiKeyTable";
import { CreateKeyModal } from "@/components/settings/CreateKeyModal";
import { WebhookGuide } from "@/components/settings/WebhookGuide";

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<APIKeyItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const keys = await apiClient.getApiKeys();
      setApiKeys(keys);
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (name: string, days?: number): Promise<APIKeyCreated> => {
    const newKey = await apiClient.createApiKey({
      name,
      expires_in_days: days,
    });
    setApiKeys((prev) => [newKey, ...prev]);
    return newKey;
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-emerald-400" />
          Settings & Integrations
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage Organization API Keys, inbound crash telemetry webhooks, and alert routing channels.
        </p>
      </div>

      {/* ── API Keys Table ──────────────────────────────────────── */}
      <ApiKeyTable
        apiKeys={apiKeys}
        onOpenCreate={() => setIsModalOpen(true)}
      />

      {/* ── Webhook Guides ───────────────────────────────────────── */}
      <WebhookGuide />

      {/* ── Create Key Modal ─────────────────────────────────────── */}
      <CreateKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateKey}
      />
    </div>
  );
}
