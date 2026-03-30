/**
 * Dashboard / Analytics API
 */

import { api } from "./client";

export type DashboardResponse = {
  todaySalesCount: number;
  todayRevenue: number;
  /** Dépenses du jour (date de dépense = aujourd’hui). Absent si API ancienne. */
  todayExpenses?: number;
  periodSalesCount: number;
  periodRevenue: number;
  periodExpenses: number;
  periodProfit: number;
  totalProducts: number;
  totalClients: number;
  totalSuppliers: number;
  totalStores: number;
  lowStockItems: {
    productId: string;
    productName: string;
    storeName: string;
    quantity: number;
    minStock: number;
  }[];
  recentSales: {
    saleId: string;
    receiptNumber: string;
    total: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
  /** Plan Starter : stats limitées à la journée */
  analyticsLimitedToToday: boolean;
  /** Plan Business : marge brute sur la période */
  periodGrossMargin: number | null;
  topMarginProducts: {
    productId: string;
    productName: string;
    marginAmount: number;
  }[];
  /** ISO-8601 : création du commerce — le bandeau d’onboarding disparaît après 2 jours côté UI */
  businessCreatedAt: string | null;
  /** Total sur la période (aperçu dans {@code topProducts}). Absent si API ancienne. */
  topProductsTotal?: number;
  /** Total alertes stock. Absent si API ancienne. */
  lowStockItemsTotal?: number;
  /** Clients avec solde crédit &gt; 0 (débiteurs). Absent si API ancienne. */
  debtorClientsCount?: number;
  /** Encours total (somme des soldes &gt; 0). Absent si API ancienne. */
  totalReceivable?: number;
};

export type DashboardSliceResponse<T> = {
  content: T[];
  total: number;
  page: number;
  size: number;
  hasNext: boolean;
};

export async function getDashboard(params?: {
  periodStart?: string; // YYYY-MM-DD
  periodEnd?: string;
  storeId?: string;
}): Promise<DashboardResponse> {
  const search = new URLSearchParams();
  if (params?.periodStart) search.set("periodStart", params.periodStart);
  if (params?.periodEnd) search.set("periodEnd", params.periodEnd);
  if (params?.storeId) search.set("storeId", params.storeId);
  const qs = search.toString();
  return api.get<DashboardResponse>(`/dashboard${qs ? `?${qs}` : ""}`);
}

const DASHBOARD_SLICE_DEFAULT = 10;

export async function getDashboardTopProductsSlice(params: {
  periodStart?: string;
  periodEnd?: string;
  storeId?: string;
  page: number;
  size?: number;
}): Promise<DashboardSliceResponse<DashboardResponse["topProducts"][number]>> {
  const search = new URLSearchParams();
  if (params.periodStart) search.set("periodStart", params.periodStart);
  if (params.periodEnd) search.set("periodEnd", params.periodEnd);
  if (params.storeId) search.set("storeId", params.storeId);
  search.set("page", String(params.page));
  search.set("size", String(params.size ?? DASHBOARD_SLICE_DEFAULT));
  return api.get(`/dashboard/top-products?${search.toString()}`);
}

export async function getDashboardLowStockSlice(params: {
  storeId?: string;
  page: number;
  size?: number;
}): Promise<DashboardSliceResponse<DashboardResponse["lowStockItems"][number]>> {
  const search = new URLSearchParams();
  if (params.storeId) search.set("storeId", params.storeId);
  search.set("page", String(params.page));
  search.set("size", String(params.size ?? DASHBOARD_SLICE_DEFAULT));
  return api.get(`/dashboard/low-stock-items?${search.toString()}`);
}

/** Vue globale : agrégation toutes boutiques + répartition par store */
export type StoreStats = {
  storeId: string;
  storeName: string;
  revenue: number;
  salesCount: number;
  sharePercent: number;
};

export type GlobalViewResponse = {
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalSalesCount: number;
  averageBasket: number;
  totalExpenses: number;
  totalProfit: number;
  storeCount: number;
  salesByStore: StoreStats[];
  lowStockItems: DashboardResponse["lowStockItems"];
  topProducts: DashboardResponse["topProducts"];
};

export async function getGlobalView(params?: {
  periodStart?: string;
  periodEnd?: string;
}): Promise<GlobalViewResponse> {
  const search = new URLSearchParams();
  if (params?.periodStart) search.set("periodStart", params.periodStart);
  if (params?.periodEnd) search.set("periodEnd", params.periodEnd);
  const qs = search.toString();
  return api.get<GlobalViewResponse>(`/dashboard/global${qs ? `?${qs}` : ""}`);
}
