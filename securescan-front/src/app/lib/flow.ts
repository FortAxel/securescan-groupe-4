/**
 * Gestion du flux : une analyse doit être lancée (Submit) avant d'accéder
 * au Dashboard, Scan, Findings et Fix. On stocke projectId et analysisId en session.
 * Le back expose /api/analysis/:analysisId/results (pas /api/projects/:id/findings).
 */

const PROJECT_STORAGE_KEY = "securescan_project_id";
const ANALYSIS_STORAGE_KEY = "securescan_analysis_id";

export function getCurrentProjectId(location: { state?: unknown }): number | null {
  const fromState = (location.state as { projectId?: number } | undefined)?.projectId;
  if (fromState != null && !Number.isNaN(fromState)) return fromState;
  const stored = sessionStorage.getItem(PROJECT_STORAGE_KEY);
  if (!stored) return null;
  const id = parseInt(stored, 10);
  return Number.isNaN(id) ? null : id;
}

export function setCurrentProjectId(projectId: number): void {
  sessionStorage.setItem(PROJECT_STORAGE_KEY, String(projectId));
}

export function clearCurrentProjectId(): void {
  sessionStorage.removeItem(PROJECT_STORAGE_KEY);
  sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
}

export function hasCurrentProject(): boolean {
  return !!sessionStorage.getItem(PROJECT_STORAGE_KEY);
}

export function getCurrentAnalysisId(location: { state?: unknown }): number | null {
  const fromState = (location.state as { analysisId?: number } | undefined)?.analysisId;
  if (fromState != null && !Number.isNaN(fromState)) return fromState;
  const stored = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
  if (!stored) return null;
  const id = parseInt(stored, 10);
  return Number.isNaN(id) ? null : id;
}

export function setCurrentAnalysisId(analysisId: number): void {
  sessionStorage.setItem(ANALYSIS_STORAGE_KEY, String(analysisId));
}
