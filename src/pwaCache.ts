/**
 * Runtime cache matcher for POS catalogue GETs (Workbox NetworkFirst).
 * Kept as a pure function so vite.config and unit tests share the same rules.
 */
export function isPosRuntimeCacheUrl(url: { pathname: string }): boolean {
  const p = url.pathname;
  return (
    p.includes("/api/v1/stock/store/") ||
    p.includes("/api/v1/categories") ||
    p.includes("/api/v1/clients") ||
    /\/api\/v1\/stores\/?$/.test(p)
  );
}
