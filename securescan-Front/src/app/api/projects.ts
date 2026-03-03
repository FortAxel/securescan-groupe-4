import { apiClient } from "./client";

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

export async function getProjectFindings(
  projectId: number
): Promise<ProjectFindingsResponse> {
  const { data } = await apiClient.get<ProjectFindingsResponse>(
    `/api/projects/${projectId}/findings`
  );
  return data;
}
