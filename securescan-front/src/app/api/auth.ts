import { apiClient } from "./client";
import { setLoggedIn, setToken, type StoredUser } from "../lib/auth";

/**
 * Réponses du backend (sync avec securescan-backend auth.routes).
 */
interface LoginResponse {
  user: { id: number; email: string; username: string };
  token: string;
}

interface RegisterResponse extends LoginResponse {}

/** Utilisateur renvoyé par GET /api/auth/me */
export interface CurrentUser {
  id: number;
  email: string;
  username: string;
  createdAt?: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await apiClient.get<{ user: CurrentUser }>("/api/auth/me");
  return data.user;
}

export async function login(
  email: string,
  password: string
): Promise<{ user: StoredUser; token: string }> {
  const { data } = await apiClient.post<LoginResponse>("/api/auth/login", {
    email,
    password,
  });
  const user: StoredUser = {
    id: data.user.id,
    email: data.user.email,
    username: data.user.username,
  };
  setLoggedIn(user);
  setToken(data.token);
  return { user, token: data.token };
}

export async function register(
  email: string,
  username: string,
  password: string
): Promise<{ user: StoredUser; token: string }> {
  const { data } = await apiClient.post<RegisterResponse>("/api/auth/register", {
    email,
    username: username.trim() || email.split("@")[0] || "user",
    password,
  });
  const user: StoredUser = {
    id: data.user.id,
    email: data.user.email,
    username: data.user.username,
  };
  setLoggedIn(user);
  setToken(data.token);
  return { user, token: data.token };
}
