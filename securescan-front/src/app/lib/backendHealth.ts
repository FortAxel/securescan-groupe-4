/**
 * Vérifie que l'URL du backend dans .env est valide et que le serveur répond.
 * Si le backend est inaccessible (mauvais VITE_BACKEND_URL ou serveur arrêté),
 * l'app affiche un message bloquant au lieu de sembler fonctionner.
 */

import { getApiBaseUrl } from "../api/client";

export type BackendHealth = "loading" | "ok" | "error";

const HEALTH_PATH = "/health";

function isValidBackendUrl(url: string): boolean {
  const trimmed = (url || "").trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

export async function checkBackendHealth(): Promise<BackendHealth> {
  const base = getApiBaseUrl()?.trim() ?? "";
  if (!base || !isValidBackendUrl(base)) {
    return "error";
  }
  const url = `${base.replace(/\/$/, "")}${HEALTH_PATH}`;
  try {
    const res = await fetch(url, { method: "GET", mode: "cors" });
    if (res.ok) return "ok";
    return "error";
  } catch {
    return "error";
  }
}
