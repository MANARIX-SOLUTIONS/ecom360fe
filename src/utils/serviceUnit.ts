export function isServiceUnit(unit: string | null | undefined): boolean {
  const normalized = (unit ?? "").trim().toLowerCase();
  return normalized === "prestation" || normalized === "forfait";
}

export const PRODUCT_UNIT_VALUES = ["pièce", "prestation", "forfait"] as const;
