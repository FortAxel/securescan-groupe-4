import { Badge } from "./ui/badge";

export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const severityColors: Record<SeverityLevel, string> = {
    critical: "bg-[var(--severity-critical-bg)] text-[var(--severity-critical)]",
    high: "bg-[var(--severity-high-bg)] text-[var(--severity-high)]",
    medium: "bg-[var(--severity-medium-bg)] text-[var(--severity-medium)]",
    low: "bg-[var(--severity-low-bg)] text-[var(--severity-low)]",
    info: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  const s = severityColors[severity] ?? severityColors.low;

  return (
    <Badge
      variant="secondary"
      className={`${s} border-0 ${className || ""}`}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}
