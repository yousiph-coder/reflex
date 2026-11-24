"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  HelpCircle,
  LogOut,
  Settings,
  User,
  Zap,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";

interface UserNavMenuProps {
  isCollapsed?: boolean;
}

export function UserNavMenu({ isCollapsed = false }: UserNavMenuProps) {
  const { user, currentOrg, billingUsage, logout, openUpgradeModal } = useTenant();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const displayName = user?.name || "Yousef";
  const activePlan = (billingUsage?.plan || currentOrg?.plan || "free").toUpperCase();
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button — Only Avatar Circle when Sidebar is Collapsed! */}
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className={`flex items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all text-left group ${
          isCollapsed ? "justify-center w-10 h-10 p-0" : "gap-2.5 p-1.5 pr-2.5 max-w-[175px]"
        }`}
        title={displayName}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border border-indigo-500/40 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}

        {!isCollapsed && (
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {displayName}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
              {activePlan} Plan
            </div>
          </div>
        )}
      </button>

      {/* Clean ChatGPT-Style Upward Popup Menu */}
      {menuOpen && (
        <div
          className={`absolute bottom-full mb-3 w-64 rounded-2xl border border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0d101b]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            isCollapsed ? "left-1" : "left-0"
          }`}
        >
          {/* User Header (Clickable to Profile) */}
          <Link
            href="/dashboard/profile"
            onClick={() => setMenuOpen(false)}
            className="p-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover border border-indigo-500/40 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-950 dark:text-white truncate">
                  {displayName}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {activePlan === "FREE" ? "Free" : activePlan}
                </div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </Link>

          {/* Menu Links to the 3 Dedicated Pages */}
          <div className="p-1.5 space-y-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openUpgradeModal();
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-semibold transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>Upgrade to Pro ($29/mo)</span>
            </button>

            <Link
              href="/dashboard/profile"
              onClick={() => setMenuOpen(false)}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-medium">Profile & Activity</span>
            </Link>

            <Link
              href="/dashboard/account"
              onClick={() => setMenuOpen(false)}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-medium">Settings</span>
            </Link>

            <Link
              href="/dashboard/help"
              onClick={() => setMenuOpen(false)}
              className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="font-medium">Help & Shortcuts</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          {/* Log Out */}
          <div className="p-1.5 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}