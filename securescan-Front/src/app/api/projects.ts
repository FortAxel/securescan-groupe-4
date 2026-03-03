import { apiClient } from "./client";

/**
 * Sync avec le back : GET /api/projects/:id/findings (à exposer côté back).
 * Si le back renvoie severity/tool en majuscules (CRITICAL, SEMGREP), on normalise.
 */

export type Severity = "critical" | "high" | "medium" | "low";

export interface ApiFinding {
  id: number;
  tool: string;
  severity: Severity;
  owaspCategory?: string;
  title: string;
  description?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface ProjectFindingsResponse {
  grade: string;
  score: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  totalVulnerabilities: number;
  findings: ApiFinding[];
}

function toSeverity(s: string): Severity {
  const lower = (s || "").toLowerCase();
  if (["critical", "high", "medium", "low"].includes(lower)) return lower as Severity;
  return "low";
}

function normalizeFinding(raw: Record<string, unknown>): ApiFinding {
  return {
    id: Number(raw.id),
    tool: typeof raw.tool === "string" ? raw.tool : String(raw.tool ?? ""),
    severity: toSeverity(String(raw.severity ?? "low")),
    owaspCategory: raw.owaspCategory != null ? String(raw.owaspCategory) : undefined,
    title: String(raw.title ?? ""),
    description: raw.description != null ? String(raw.description) : undefined,
    filePath: raw.filePath != null ? String(raw.filePath) : undefined,
    lineStart: raw.lineStart != null ? Number(raw.lineStart) : undefined,
    lineEnd: raw.lineEnd != null ? Number(raw.lineEnd) : undefined,
  };
}

export async function getProjectFindings(
  projectId: number
): Promise<ProjectFindingsResponse> {
  const { data } = await apiClient.get<Record<string, unknown>>(
    `/api/projects/${projectId}/findings`
  );
  const findings = Array.isArray(data.findings)
    ? (data.findings as Record<string, unknown>[]).map(normalizeFinding)
    : [];
  return {
    grade: String(data.grade ?? "N/A"),
    score: Number(data.score ?? 0),
    critical: Number(data.critical ?? 0),
    high: Number(data.high ?? 0),
    medium: Number(data.medium ?? 0),
    low: Number(data.low ?? 0),
    totalVulnerabilities: Number(data.totalVulnerabilities ?? 0),
    findings,
  };
}
