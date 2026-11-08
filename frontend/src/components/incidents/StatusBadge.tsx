import { IncidentStatus } from "@/lib/types";
import { cn, getStatusBadgeConfig } from "@/lib/utils";

interface StatusBadgeProps {
  status: IncidentStatus | string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = getStatusBadgeConfig(status);
  const textLabel = label || config.label.replace(/^●\s*/, "");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border select-none transition-all duration-200",
        config.bg,
        config.border,
        config.text,
        config.glow,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
      <span>{textLabel}</span>
    </span>
  );
}
