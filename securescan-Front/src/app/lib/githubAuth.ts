/**
 * Flux OAuth GitHub : stockage du scan en attente et redirection.
 * Quand le backend renvoie 401 "GitHub account not connected" avec redirectTo,
 * on enregistre le scan en attente et on redirige vers l’OAuth.
 */

const PENDING_SCAN_KEY = "securescan_pending_scan";

export interface PendingScan {
  gitUrl: string;
  name?: string;
}

export function setPendingScan(gitUrl: string, name?: string): void {
  sessionStorage.setItem(PENDING_SCAN_KEY, JSON.stringify({ gitUrl, name: name ?? undefined }));
}

export function getAndClearPendingScan(): PendingScan | null {
  const raw = sessionStorage.getItem(PENDING_SCAN_KEY);
  sessionStorage.removeItem(PENDING_SCAN_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PendingScan;
    return data?.gitUrl ? data : null;
  } catch {
    return null;
  }
}

export function redirectToGitHubOAuth(apiBaseUrl: string, redirectPath: string): void {
  const url = redirectPath.startsWith("http") ? redirectPath : `${apiBaseUrl.replace(/\/$/, "")}${redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`}`;
  window.location.href = url;
}
