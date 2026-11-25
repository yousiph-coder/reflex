"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { Loader2, Sparkles } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, sessionToken, isAuthenticated, isLoading } = useTenant();
  const hasSession = Boolean(session || sessionToken || isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !hasSession) {
      const from = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?from=${from}`);
    }
  }, [mounted, isLoading, hasSession, pathname, router]);

  // Prevent browser-extension DOM mutations (e.g. bis_skin_checked) from triggering SSR hydration mismatches
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07080d] flex flex-col items-center justify-center gap-4 select-none transition-colors duration-200">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.35)] animate-pulse">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white font-mono">
            Reflex
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Verifying SRE tenant session...
          </p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return null;
  }

  return (
    <div
      suppressHydrationWarning
      className="flex h-screen overflow-hidden bg-[#f8fafc] dark:bg-[#07080d] text-slate-900 dark:text-white transition-colors duration-200"
    >
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <UpgradeModal />
    </div>
  );
}
