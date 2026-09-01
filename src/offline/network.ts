/** True when the browser reports no network (navigator.onLine === false). */
export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * A 401 while offline is almost always an unreachable refresh, not a dead session.
 * Clearing auth would kick the cashier out of a still-usable POS shell.
 */
export function shouldExpireSessionOn401(offline = isBrowserOffline()): boolean {
  return !offline;
}
