import { api } from "./client";
import type { PageResponse } from "./products";

export type StockLevelResponse = {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  quantity: number;
  minStock: number;
  lowStock: boolean;
  updatedAt: string;
  salePrice: number | null;
  categoryId: string | null;
  imageUrl: string | null;
};

export type StockInitRequest = {
  productId: string;
  storeId: string;
  quantity: number;
  minStock?: number;
};

export type StockAdjustmentRequest = {
  productId: string;
  storeId: string;
  quantity: number;
  type: "in" | "out" | "adjustment";
  reference?: string;
  note?: string;
};

export async function getStockByStore(
  storeId: string,
  params?: { page?: number; size?: number; search?: string; productIds?: string[] }
): Promise<PageResponse<StockLevelResponse> | StockLevelResponse[]> {
  const search = new URLSearchParams();
  if (params?.productIds?.length) {
    for (const id of params.productIds) search.append("productIds", id);
    const qs = search.toString();
    return api.get<StockLevelResponse[]>(`/stock/store/${storeId}?${qs}`);
  }
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  if (params?.search) search.set("search", params.search);
  const qs = search.toString();
  return api.get<PageResponse<StockLevelResponse>>(
    `/stock/store/${storeId}${qs ? `?${qs}` : "?page=0&size=40"}`
  );
}

/** Stock for specific products in a store (products list page). */
export async function getStockForProducts(
  storeId: string,
  productIds: string[]
): Promise<StockLevelResponse[]> {
  if (productIds.length === 0) return [];
  const res = await getStockByStore(storeId, { productIds });
  return Array.isArray(res) ? res : res.content;
}

export async function getStockLevel(
  productId: string,
  storeId: string
): Promise<StockLevelResponse> {
  return api.get<StockLevelResponse>(`/stock/product/${productId}/store/${storeId}`);
}

export async function initStock(req: StockInitRequest): Promise<StockLevelResponse> {
  return api.post<StockLevelResponse>("/stock/init", req);
}

export async function adjustStock(req: StockAdjustmentRequest): Promise<unknown> {
  return api.post("/stock/adjust", req);
}

export type StockMovementResponse = {
  id: string;
  productId: string;
  storeId: string;
  userId: string;
  type: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

export async function getStockMovements(
  productId: string,
  storeId: string,
  params?: { page?: number; size?: number }
): Promise<{ content: StockMovementResponse[]; totalElements: number }> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<{ content: StockMovementResponse[]; totalElements: number }>(
    `/stock/movements/product/${productId}/store/${storeId}${qs ? `?${qs}` : ""}`
  );
}
