import { apiClient } from "./client";
import { normalizeSeverity } from "../constants/severity";

/**
 * Sync avec le back : GET /api/analysis/:analysisId/results.
 * Sévérités alignées sur le schema Prisma (CRITICAL, HIGH, MEDIUM, LOW, INFO).
 */
export type { SeverityLevel as Severity } from "../constants/severity";

export interface AnalysisFinding {
  id: number;
  file: string | null;
  line: number | null;
  description: string | null;
  severity: string;
  owasp: string | null;
  tool: string;
  fixStatus: string;
}

export interface AnalysisResultsResponse {
  projectId: number;
  projectName: string;
  analysisId: number;
  status: string;
  score: number;
  grade: string;
  startedAt: string | null;
  finishedAt: string | null;
  summary: { critical: number; high: number; medium: number; low: number; info: number };
  findings: AnalysisFinding[];
}

export interface OwaspBreakdownResponse {
  analysisId: number;
  byOwasp: Record<string, { critical: number; high: number; medium: number; low: number; info: number; total: number }>;
}

function normalizeFinding(raw: AnalysisFinding): AnalysisFinding {
  return {
    id: Number(raw.id),
    file: raw.file ?? null,
    line: raw.line != null ? Number(raw.line) : null,
    description: raw.description ?? null,
    severity: normalizeSeverity(raw.severity),
    owasp: raw.owasp ?? null,
    tool: typeof raw.tool === "string" ? raw.tool : String(raw.tool ?? ""),
    fixStatus: typeof raw.fixStatus === "string" ? raw.fixStatus : "PENDING",
  };
}

export async function getAnalysisResults(analysisId: number): Promise<AnalysisResultsResponse> {
  const { data } = await apiClient.get<AnalysisResultsResponse>(
    `/api/analysis/${analysisId}/results`
  );
  return {
    ...data,
    findings: (data.findings ?? []).map(normalizeFinding),
  };
}

export async function getAnalysisOwaspBreakdown(
  analysisId: number
): Promise<OwaspBreakdownResponse> {
  const { data } = await apiClient.get<OwaspBreakdownResponse>(
    `/api/analysis/${analysisId}/results/owasp`
  );
  return data;
}
