/**
 * Variation en % entre la valeur courante et la période précédente (même durée).
 * Retourne null si la comparaison n'est pas pertinente.
 */
export function pctChangeVsPrevious(cur: number, prev: number | undefined | null): number | null {
  if (prev === undefined || prev === null) return null;
  if (prev === 0) return cur === 0 ? null : 100;
  return Math.round(((cur - prev) / prev) * 10000) / 100;
}
