/**
 * Stock / Inventory API
 */

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
  params?: { page?: number; size?: number; search?: string }
): Promise<PageResponse<StockLevelResponse>> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  if (params?.search) search.set("search", params.search);
  const qs = search.toString();
  return api.get<PageResponse<StockLevelResponse>>(`/stock/store/${storeId}${qs ? `?${qs}` : ""}`);
}

/** Stock levels for a set of products in a store (products list page). */
export async function getStockByStoreAndProducts(
  storeId: string,
  productIds: string[]
): Promise<StockLevelResponse[]> {
  if (productIds.length === 0) return [];
  const search = new URLSearchParams();
  for (const id of productIds) {
    search.append("productIds", id);
  }
  return api.get<StockLevelResponse[]>(`/stock/store/${storeId}?${search.toString()}`);
}

const STOCK_PAGE_SIZE = 100;

/** All stock levels for a store (POS catalog). */
export async function getAllStockByStore(
  storeId: string,
  searchTerm?: string
): Promise<StockLevelResponse[]> {
  const first = await getStockByStore(storeId, {
    page: 0,
    size: STOCK_PAGE_SIZE,
    search: searchTerm,
  });
  const items = [...(first.content ?? [])];
  const totalPages = first.totalPages ?? 1;
  for (let page = 1; page < totalPages; page++) {
    const next = await getStockByStore(storeId, {
      page,
      size: STOCK_PAGE_SIZE,
      search: searchTerm,
    });
    items.push(...(next.content ?? []));
  }
  return items;
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
