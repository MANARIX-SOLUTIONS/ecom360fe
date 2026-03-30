import { getMyPermissions } from "@/api/permissions";
import { DEFAULT_NAVIGATION_RULES } from "@/constants/defaultNavigationRules";
import { PERMISSIONS_CACHE_KEY } from "@/constants/storageKeys";

/** Âge max (ms) pour éviter un second GET /permissions/me juste après prefetch (login / register). */
const FRESH_BUNDLE_MAX_AGE_MS = 5000;

export type PermissionsBundle = {
  permissions: string[];
  navigationRules: Record<string, string[]>;
  role: string | null;
  /** Horodatage écrit à chaque mise à jour du cache (évite les refetch redondants). */
  fetchedAt?: number;
};

export function readPermissionsBundle(): PermissionsBundle | null {
  try {
    const raw = localStorage.getItem(PERMISSIONS_CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PermissionsBundle;
    if (!p || !Array.isArray(p.permissions)) return null;
    return p;
  } catch {
    return null;
  }
}

export function writePermissionsBundle(b: PermissionsBundle): void {
  try {
    const withTs: PermissionsBundle = { ...b, fetchedAt: Date.now() };
    localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(withTs));
  } catch {
    // ignore
  }
}

/** True si le cache vient d’être rempli (ex. prefetch) — pas besoin de refetch immédiat. */
export function shouldSkipPermissionsRefetch(maxAgeMs: number = FRESH_BUNDLE_MAX_AGE_MS): boolean {
  const b = readPermissionsBundle();
  if (b?.fetchedAt == null) return false;
  return Date.now() - b.fetchedAt < maxAgeMs;
}

/**
 * Appelle /permissions/me après login pour remplir le cache avant la navigation
 * (évite un menu vide le temps du premier rendu).
 */
export async function prefetchPermissionsBundle(): Promise<void> {
  if (!localStorage.getItem("ecom360_access_token")) return;
  try {
    const res = await getMyPermissions();
    const perms = res.permissions ?? [];
    const rules =
      res.navigationRules && Object.keys(res.navigationRules).length > 0
        ? res.navigationRules
        : DEFAULT_NAVIGATION_RULES;
    writePermissionsBundle({
      permissions: perms,
      navigationRules: rules,
      role: res.role ?? null,
    });
  } catch {
    // usePermissions refera un fetch au montage
  }
}
