import { apiClient } from "./client";

/**
 * Scan du compte connecté (sync avec GET /api/me/scans).
 */
export interface ScanReportFromApi {
  id: string;
  projectId: number;
  projectName: string;
  date: string;
  /** ISO date pour tri/filtre */
  createdAt?: string;
  grade: string;
  score: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  status: "completed" | "running" | "failed";
  totalVulnerabilities: number;
}

export interface MyScansResponse {
  scans: ScanReportFromApi[];
}

export async function getMyScans(): Promise<ScanReportFromApi[]> {
  const { data } = await apiClient.get<MyScansResponse>("/api/me/scans");
  return data.scans ?? [];
}
