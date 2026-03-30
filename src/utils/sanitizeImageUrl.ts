/**
 * Restricts user-supplied URLs for <img src> / print: https?, or same-origin API paths (logo uploadé).
 */
export function sanitizeExternalImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const t = url.trim();
  if (!t) return undefined;
  if (t.startsWith("/api/")) return t;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}
