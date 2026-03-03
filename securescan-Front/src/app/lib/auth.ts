/**
 * Auth côté front : utilisateur connecté + token pour les appels API.
 * Synchronisé avec le backend (POST /api/auth/login, register).
 */

const AUTH_KEY = "securescan_auth";
const TOKEN_KEY = "securescan_token";

export interface StoredUser {
  id?: number;
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

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function isLoggedIn(): boolean {
  return getStoredUser() !== null;
}

export function setLoggedIn(user: StoredUser): void {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
