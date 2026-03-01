/**
 * Sales / POS API
 */

import { api } from "./client";
import type { PageResponse } from "./products";

export type SaleLineRequest = {
  productId: string;
  quantity: number;
};

export type SaleLineResponse = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SaleRequest = {
  storeId: string;
  clientId?: string | null;
  paymentMethod: string;
  discountAmount?: number;
  amountReceived?: number;
  note?: string;
  lines: SaleLineRequest[];
};

export type SaleResponse = {
  id: string;
  businessId: string;
  storeId: string;
  storeName?: string;
  storeAddress?: string;
  userId: string;
  clientId: string | null;
  receiptNumber: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  amountReceived: number | null;
  changeGiven: number | null;
  status: string;
  note: string | null;
  lines: SaleLineResponse[];
  createdAt: string;
};

export async function createSale(req: SaleRequest): Promise<SaleResponse> {
  return api.post<SaleResponse>("/sales", req);
}

export async function getSale(id: string): Promise<SaleResponse> {
  return api.get<SaleResponse>(`/sales/${id}`);
}

export async function listSales(params?: {
  storeId?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SaleResponse>> {
  const search = new URLSearchParams();
  if (params?.storeId) search.set("storeId", params.storeId);
  if (params?.periodStart) search.set("periodStart", params.periodStart);
  if (params?.periodEnd) search.set("periodEnd", params.periodEnd);
  if (params?.status) search.set("status", params.status);
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<PageResponse<SaleResponse>>(`/sales${qs ? `?${qs}` : ""}`);
}

export async function voidSale(id: string): Promise<SaleResponse> {
  return api.post<SaleResponse>(`/sales/${id}/void`);
}
