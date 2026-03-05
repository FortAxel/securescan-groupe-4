import { Badge } from "./ui/badge";
import { type SeverityLevel, SEVERITY_LEVELS } from "../constants/severity";

export type { SeverityLevel } from "../constants/severity";

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
}

const severityColors: Record<SeverityLevel, string> = {
    critical: "bg-[var(--severity-critical-bg)] text-[var(--severity-critical)]",
    high: "bg-[var(--severity-high-bg)] text-[var(--severity-high)]",
    medium: "bg-[var(--severity-medium-bg)] text-[var(--severity-medium)]",
    low: "bg-[var(--severity-low-bg)] text-[var(--severity-low)]",
    info: "bg-[var(--severity-info-bg)] text-[var(--severity-info)]",
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const level = SEVERITY_LEVELS.includes(severity as SeverityLevel) ? severity : "low";
  const s = severityColors[level];

  return (
    <Badge
      variant="secondary"
      className={`${s} border-0 ${className || ""}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
}
