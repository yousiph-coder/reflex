"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Command,
  CreditCard,
  ExternalLink,
  FolderGit2,
  KeyRound,
  LayoutDashboard,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  category: "Navigation" | "Actions" | "System";
  label: string;
  sublabel?: string;
  icon: any;
  action: () => void;
  shortcut?: string;
  badge?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { openUpgradeModal } = useTenant();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-overview",
      category: "Navigation",
      label: "Overview Dashboard",
      sublabel: "Real-time MTTR, incident volume & recovery metrics",
      icon: LayoutDashboard,
      action: () => {
        router.push("/dashboard");
        onClose();
      },
      shortcut: "G O",
    },
    {
      id: "nav-incidents",
      category: "Navigation",
      label: "Incident Explorer",
      sublabel: "Browse active crashes, AST patches & PR logs",
      icon: AlertTriangle,
      action: () => {
        router.push("/dashboard/incidents");
        onClose();
      },
      shortcut: "G I",
    },
    {
      id: "nav-repos",
      category: "Navigation",
      label: "Monitored Repositories",
      sublabel: "Manage GitHub repositories and Sentry project mappings",
      icon: FolderGit2,
      action: () => {
        router.push("/dashboard/repositories");
        onClose();
      },
      shortcut: "G R",
    },
    {
      id: "nav-billing",
      category: "Navigation",
      label: "Subscription & Billing",
      sublabel: "View usage limits, quotas & plan details",
      icon: CreditCard,
      action: () => {
        router.push("/dashboard/settings/billing");
        onClose();
      },
      shortcut: "G B",
    },
    {
      id: "nav-settings",
      category: "Navigation",
      label: "API Keys & Integrations",
      sublabel: "Manage webhook secrets, tokens & Sentry sinks",
      icon: KeyRound,
      action: () => {
        router.push("/dashboard/settings");
        onClose();
      },
      shortcut: "G S",
    },

    // Actions
    {
      id: "action-upgrade",
      category: "Actions",
      label: "Upgrade to AutoHeal Pro",
      sublabel: "Unlock unlimited autonomous fixes, priority queue & SLA",
      icon: Zap,
      action: () => {
        openUpgradeModal();
        onClose();
      },
      badge: "PRO",
    },
    {
      id: "action-connect-repo",
      category: "Actions",
      label: "Connect New Repository",
      sublabel: "Configure autonomous closed-loop healing for codebase",
      icon: FolderGit2,
      action: () => {
        router.push("/dashboard/repositories");
        onClose();
      },
    },
    {
      id: "action-theme-toggle",
      category: "Actions",
      label: theme === "dark" ? "Switch to Light Theme" : "Switch to Dark (OLED) Theme",
      sublabel: theme === "dark" ? "High-contrast clean daylight interface" : "OLED Pure Black with Apple Liquid Glass",
      icon: theme === "dark" ? Sun : Moon,
      action: () => {
        toggleTheme();
        onClose();
      },
      shortcut: "T T",
    },

    // System
    {
      id: "sys-target-repo",
      category: "System",
      label: "Open Target Demo Repository",
      sublabel: "View live GitHub repository: yousiph-coder/autoheal-target-demo",
      icon: ExternalLink,
      action: () => {
        window.open("https://github.com/yousiph-coder/autoheal-target-demo", "_blank");
        onClose();
      },
    },
    {
      id: "sys-status",
      category: "System",
      label: "Agent Engine Health Check",
      sublabel: "Status: ONLINE • GPT-4o Engine • Docker Ephemeral Runner",
      icon: ShieldCheck,
      action: () => {
        router.push("/dashboard");
        onClose();
      },
      badge: "ACTIVE",
    },
  ];

  // Filter commands by search query
  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.label.toLowerCase().includes(q) ||
      (cmd.sublabel && cmd.sublabel.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Handle arrow key navigation & enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl liquid-glass-elevated border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
          <Search className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search (e.g. incidents, repos, billing, theme)..."
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-200 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-white/10">
            ESC
          </kbd>
        </div>

        {/* Command List Viewport */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono space-y-1">
              <p>No matching commands found for &quot;{query}&quot;</p>
              <p className="text-[11px] text-zinc-400">Try searching for &quot;incidents&quot;, &quot;repos&quot;, or &quot;theme&quot;</p>
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all text-xs group",
                    isSelected
                      ? "bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/15 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100/60 dark:hover:bg-white/[0.03] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                        isSelected
                          ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 shadow-glow-emerald"
                          : "bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-xs flex items-center gap-2 text-zinc-900 dark:text-white font-mono">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.sublabel && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {item.shortcut && (
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200/60 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-white/10">
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        isSelected
                          ? "text-emerald-500 dark:text-emerald-400 translate-x-0.5"
                          : "text-zinc-400 opacity-0 group-hover:opacity-100"
                      )}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-5 py-2.5 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-[10px]">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-[10px]">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <span className="text-zinc-400">AutoHeal Command Palette</span>
        </div>
      </div>
    </div>
  );
}
