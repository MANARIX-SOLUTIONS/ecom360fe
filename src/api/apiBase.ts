/**
 * Backend origin for fetch() and for resolving `/api/...` asset URLs (split-domain prod).
 * Dev: localhost:8080. Prod: VITE_API_URL or '' for same-origin proxy.
 */
export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8080" : "");

export function getApiBaseUrl(): string {
  return API_BASE;
}
