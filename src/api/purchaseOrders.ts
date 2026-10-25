/**
 * Purchase orders (bons de commande) API
 */

import { api } from "./client";
import type { PageResponse } from "./products";

export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export type PurchaseOrderLineResponse = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
};

export type PurchaseOrderResponse = {
  id: string;
  businessId: string;
  supplierId: string;
  storeId: string;
  userId: string;
  reference: string;
  status: PurchaseOrderStatus | string;
  totalAmount: number;
  expectedDate: string | null;
  receivedDate: string | null;
  note: string | null;
  lines: PurchaseOrderLineResponse[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderLineRequest = {
  productId: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrderRequest = {
  supplierId: string;
  storeId: string;
  expectedDate?: string | null;
  note?: string | null;
  lines: PurchaseOrderLineRequest[];
};

export async function listPurchaseOrders(params?: {
  page?: number;
  size?: number;
  status?: string;
  supplierId?: string;
}): Promise<PageResponse<PurchaseOrderResponse>> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  if (params?.status) search.set("status", params.status);
  if (params?.supplierId) search.set("supplierId", params.supplierId);
  const qs = search.toString();
  return api.get<PageResponse<PurchaseOrderResponse>>(`/purchase-orders${qs ? `?${qs}` : ""}`);
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderResponse> {
  return api.get<PurchaseOrderResponse>(`/purchase-orders/${id}`);
}

export async function createPurchaseOrder(
  req: PurchaseOrderRequest
): Promise<PurchaseOrderResponse> {
  return api.post<PurchaseOrderResponse>("/purchase-orders", req);
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus | string
): Promise<PurchaseOrderResponse> {
  return api.patch<PurchaseOrderResponse>(`/purchase-orders/${id}/status`, { status });
}
