import { Badge } from "./ui/badge";

interface ScoreBadgeProps {
  grade: string;
  score: number;
  className?: string;
}

export function ScoreBadge({ grade, score, className }: ScoreBadgeProps) {
  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "bg-green-100 text-green-700 border-green-200",
      B: "bg-green-100 text-green-600 border-green-200",
      C: "bg-yellow-100 text-yellow-700 border-yellow-200",
      D: "bg-orange-100 text-orange-700 border-orange-200",
      F: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[grade] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <Badge
      variant="secondary"
      className={`${getGradeColor(grade)} ${className || ""}`}
    >
      {grade} ({score})
    </Badge>
  );
}
