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
  badgeColor?: "emerald" | "purple" | "blue" | "amber";
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
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="p-5 rounded-xl border border-zinc-800 bg-[#121215] hover:border-zinc-700/80 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
        <div className={cn("p-2 rounded-lg border", colorStyles[badgeColor])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-3xl font-bold tracking-tight text-white font-mono">{value}</div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              trend.neutral
                ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                : trend.positive
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                : "bg-rose-950/40 text-rose-400 border-rose-800/40"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-zinc-500 mt-2">{subtitle}</p>}
    </div>
  );
}
