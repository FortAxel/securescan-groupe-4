import { Badge } from "./ui/badge";

export type ScanStatus = "completed" | "running" | "failed";

interface StatusBadgeProps {
  status: ScanStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    completed: {
      color: "bg-green-100 text-green-700 border-green-200",
      label: "Completed",
    },
    running: {
      color: "bg-blue-100 text-blue-700 border-blue-200",
      label: "Running",
    },
    failed: {
      color: "bg-red-100 text-red-700 border-red-200",
      label: "Failed",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant="secondary" className={`${config.color} ${className || ""}`}>
      {config.label}
    </Badge>
  );
}
