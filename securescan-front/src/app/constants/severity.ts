/**
 * Sévérités alignées avec le schema Prisma (enum Severity).
 * Le backend renvoie en majuscules (CRITICAL, HIGH, etc.) ; le front utilise
 * la forme minuscule pour l’affichage et les styles.
 */
export const SEVERITY_PRISMA = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
export type SeverityPrisma = (typeof SEVERITY_PRISMA)[number];

/** Niveau de sévérité côté front (minuscules, pour UI et CSS). */
export const SEVERITY_LEVELS = ["critical", "high", "medium", "low", "info"] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

/** Convertit une chaîne API (upper ou lower) vers SeverityLevel. */
export function normalizeSeverity(s: string | null | undefined): SeverityLevel {
  const lower = (s ?? "").trim().toLowerCase();
  if (SEVERITY_LEVELS.includes(lower as SeverityLevel)) return lower as SeverityLevel;
  return "low";
}

export function isSeverityLevel(s: string): s is SeverityLevel {
  return SEVERITY_LEVELS.includes(s as SeverityLevel);
}
