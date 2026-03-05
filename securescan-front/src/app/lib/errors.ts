/** Message d'erreur générique affiché à l'utilisateur en cas d'échec d'une requête (sans redirection). */
export const GENERIC_ERROR_MESSAGE = "Une erreur est survenue.";

/**
 * Extrait un message d'erreur lisible depuis une erreur axios / fetch.
 * Retourne le message backend si présent, sinon GENERIC_ERROR_MESSAGE.
 */
export function getErrorMessage(
  err: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE
): string {
  const ax = err as {
    response?: { data?: { error?: string; detail?: string }; status?: number };
    message?: string;
    code?: string;
  };
  const fromResponse =
    ax.response?.data?.error ?? ax.response?.data?.detail;
  if (typeof fromResponse === "string" && fromResponse.trim()) {
    return fromResponse.trim();
  }
  if (typeof ax.message === "string" && ax.message.trim()) {
    return ax.message.trim();
  }
  return fallback;
}
