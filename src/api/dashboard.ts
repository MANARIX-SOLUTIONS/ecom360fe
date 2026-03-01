/**
 * Dashboard / Analytics API
 */

import { api } from "./client";

export type DashboardResponse = {
  todaySalesCount: number;
  todayRevenue: number;
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
