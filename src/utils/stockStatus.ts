import { isServiceUnit } from "@/utils/serviceUnit";

export type StockDisplayStatus = "available" | "low" | "out" | "untracked";

export function stockDisplayStatus(opts: {
  unit?: string | null;
  quantity: number;
  minStock: number;
}): StockDisplayStatus {
  if (isServiceUnit(opts.unit)) return "untracked";
  if (opts.quantity <= 0) return "out";
  if (opts.minStock > 0 && opts.quantity <= opts.minStock) return "low";
  return "available";
}

export const STOCK_STATUS_LABEL: Record<StockDisplayStatus, string> = {
  available: "Disponible",
  low: "Stock faible",
  out: "Rupture",
  untracked: "Non suivi",
};

export const STOCK_STATUS_COLOR: Record<
  StockDisplayStatus,
  "success" | "warning" | "error" | "default"
> = {
  available: "success",
  low: "warning",
  out: "error",
  untracked: "default",
};
