import axios from "axios";
import { getToken } from "../lib/auth";

const baseURL =
  import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/** URL de base de l’API (pour redirection OAuth GitHub, etc.). */
export function getApiBaseUrl(): string {
  return baseURL;
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
