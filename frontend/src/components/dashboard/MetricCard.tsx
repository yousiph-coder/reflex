import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    positive?: boolean;
    neutral?: boolean;
  };
  icon: LucideIcon;
  badgeColor?: "emerald" | "purple" | "blue" | "amber" | "crimson";
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  badgeColor = "emerald",
}: MetricCardProps) {
  const colorStyles = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:glow-emerald",
    purple: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:glow-amber",
    crimson: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 dark:glow-crimson",
  };

  return (
    <div className="p-5 rounded-2xl liquid-glass border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all duration-300 group select-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            {title}
          </span>
          <div className={cn("p-2.5 rounded-xl border transition-transform duration-300 group-hover:scale-105", colorStyles[badgeColor])}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 overflow-hidden">
          <div className="font-mono text-3xl font-bold text-zinc-950 dark:text-white">
            {value}
          </div>
          {trend && (
            <span
              className={cn(
                "whitespace-nowrap shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold",
                trend.neutral
                  ? "bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
                  : trend.positive
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:glow-emerald"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 dark:glow-crimson"
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2.5 font-sans leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
