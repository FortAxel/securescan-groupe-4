import { apiClient } from "./client";

/**
 * Démarrer un vrai scan : POST /api/projects (clone Git + scan + sauvegarde en BDD).
 */
export interface StartScanResponse {
  projectId: number;
  analysisId: number;
  projectName: string;
  status: string;
  score: number;
  grade: string;
  findingsCount: number;
}

/** Délai max pour le scan (clone + analyse) : 5 minutes. */
const SCAN_TIMEOUT_MS = 5 * 60 * 1000;

export async function startProjectScan(params: {
  url: string;
  name?: string;
}): Promise<StartScanResponse> {
  const { data } = await apiClient.post<StartScanResponse>(
    "/api/projects",
    {
      sourceUrl: params.url.trim(),
      url: params.url.trim(),
      name: params.name?.trim() || undefined,
    },
    { timeout: SCAN_TIMEOUT_MS }
  );
  return data;
}

/**
 * Upload d’un ZIP : POST /api/projects/upload (si le back expose GET, adapter l’appel).
 * Retourne analysisId (et projectId) comme le scan Git.
 */
export async function uploadProjectZip(file: File): Promise<StartScanResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<StartScanResponse>("/api/projects/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: SCAN_TIMEOUT_MS,
  });
  return data;
}

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
