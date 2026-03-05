import { apiClient } from "./client";

/**
 * POST /api/analysis/:analysisId/apply
 * Applique toutes les corrections validées.
 * - Projet GIT → branche + PR → retourne { pullRequestUrl, branchName, correctionsApplied }
 * - Projet ZIP → téléchargement du ZIP corrigé
 */
export interface ApplyResponse {
  pullRequestUrl?: string;
  branchName?: string;
  correctionsApplied?: number;
  zipDownloaded?: boolean;
}

export async function applyCorrections(analysisId: number): Promise<ApplyResponse> {
  const res = await apiClient.post<Blob | ApplyResponse>(
    `/api/analysis/${analysisId}/apply`,
    {},
    { responseType: "blob" }
  );
  const contentType = (res.headers as Record<string, string>)["content-type"] ?? "";
  if (contentType.includes("application/json")) {
    const text = await (res.data as Blob).text();
    return JSON.parse(text) as ApplyResponse;
  }
  if (contentType.includes("application/zip") || (res.data instanceof Blob && (res.data as Blob).size > 0)) {
    const blob = res.data as Blob;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `securescan-corrected-${analysisId}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    return { zipDownloaded: true };
  }
  return {};
}
