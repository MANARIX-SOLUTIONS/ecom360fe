/**
 * Détection du client générique « comptoir » (vente anonyme agrégée).
 * Aligné sur le comportement POS.
 */
export const WALK_IN_CLIENT_NAME = "Client comptoir";

const WALK_IN_ALIASES = new Set(["client comptoir", "walk-in", "walk in", "client anonyme"]);

export function normalizeWalkInClientName(name: string): string {
  return name.trim().toLowerCase();
}

export function isWalkInClientName(name: string): boolean {
  return WALK_IN_ALIASES.has(normalizeWalkInClientName(name));
}
