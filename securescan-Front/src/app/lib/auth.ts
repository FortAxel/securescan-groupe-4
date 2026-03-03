/**
 * Auth côté front : savoir si l'utilisateur est connecté.
 * Quand le back sera prêt, on pourra remplacer par les vrais appels API.
 */

const AUTH_KEY = "securescan_auth";

export interface StoredUser {
  email: string;
  username: string;
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredUser;
    return data?.email && data?.username ? data : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getStoredUser() !== null;
}

export function setLoggedIn(user: StoredUser): void {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY);
}
