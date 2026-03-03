/**
 * Gestion du flux : une analyse doit être lancée (Submit) avant d'accéder
 * au Dashboard, Scan, Findings et Fix. On stocke l'id du projet en session.
 */

const STORAGE_KEY = "securescan_project_id";

export function getCurrentProjectId(location: { state?: unknown }): number | null {
  const fromState = (location.state as { projectId?: number } | undefined)?.projectId;
  if (fromState != null && !Number.isNaN(fromState)) return fromState;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  const id = parseInt(stored, 10);
  return Number.isNaN(id) ? null : id;
}

export function setCurrentProjectId(projectId: number): void {
  sessionStorage.setItem(STORAGE_KEY, String(projectId));
}

export function clearCurrentProjectId(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function hasCurrentProject(): boolean {
  return !!sessionStorage.getItem(STORAGE_KEY);
}
