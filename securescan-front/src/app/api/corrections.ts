import { apiClient } from "./client";

/**
 * Sync avec le back : GET /api/corrections/:findingId
 * POST /api/corrections/:findingId/validate
 * POST /api/corrections/:findingId/reject
 */

export interface CorrectionFromApi {
  id: number;
  findingId: number;
  type: string;
  originalSnippet: string;
  fixedSnippet: string;
  status: string;
  createdAt: string;
  validatedAt: string | null;
}

export async function getCorrection(findingId: number): Promise<CorrectionFromApi> {
  const { data } = await apiClient.get<CorrectionFromApi>(`/api/corrections/${findingId}`);
  return data;
}

export async function validateCorrection(findingId: number): Promise<{ success: boolean; findingId: number; status: string }> {
  const { data } = await apiClient.post<{ success: boolean; findingId: number; status: string }>(
    `/api/corrections/${findingId}/validate`
  );
  return data;
}

export async function rejectCorrection(findingId: number): Promise<{ success: boolean; findingId: number; status: string }> {
  const { data } = await apiClient.post<{ success: boolean; findingId: number; status: string }>(
    `/api/corrections/${findingId}/reject`
  );
  return data;
}
