/**
 * Réduit un chemin complet (ex. /tmp/securescan/1772707108304/lib/insecurity.ts)
 * en chemin relatif au projet (ex. /lib/insecurity.ts).
 */
export function shortFilePath(path: string): string {
  if (!path || typeof path !== "string") return path;
  return path.replace(/^\/tmp\/securescan\/\d+/, "") || path;
}
