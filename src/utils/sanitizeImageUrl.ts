import { getApiBaseUrl } from "@/api/apiBase";

/**
 * Restricts user-supplied URLs for &lt;img src&gt; / print: https?, or API paths for uploaded logos.
 * Relative `/api/...` is turned into an absolute URL when `VITE_API_URL` points at the API host
 * (otherwise &lt;img&gt; would hit the SPA origin and 404).
 */
export function sanitizeExternalImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const t = url.trim();
  if (!t) return undefined;
  if (t.startsWith("/api/")) {
    const base = getApiBaseUrl().replace(/\/$/, "");
    return base ? `${base}${t}` : t;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}
