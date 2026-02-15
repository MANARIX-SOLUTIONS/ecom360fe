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
}): Promise<DashboardResponse> {
  const search = new URLSearchParams();
  if (params?.periodStart) search.set("periodStart", params.periodStart);
  if (params?.periodEnd) search.set("periodEnd", params.periodEnd);
  const qs = search.toString();
  return api.get<DashboardResponse>(`/dashboard${qs ? `?${qs}` : ""}`);
}
