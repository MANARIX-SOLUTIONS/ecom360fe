/**
 * Products API
 */

import { api } from "./client";

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
};

export type ProductResponse = {
  id: string;
  businessId: string;
  categoryId: string | null;
  storeId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  costPrice: number;
  salePrice: number;
  unit: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductRequest = {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  unit?: string;
  imageUrl?: string | null;
  categoryId?: string | null;
  isActive?: boolean;
  storeId: string;
  initialStock?: number;
  minStock?: number;
};

export async function listProducts(params?: {
  page?: number;
  size?: number;
  search?: string;
  storeId?: string;
}): Promise<PageResponse<ProductResponse>> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  if (params?.search) search.set("search", params.search);
  if (params?.storeId) search.set("storeId", params.storeId);
  const qs = search.toString();
  return api.get<PageResponse<ProductResponse>>(`/products${qs ? `?${qs}` : ""}`);
}

export async function getProduct(id: string): Promise<ProductResponse> {
  return api.get<ProductResponse>(`/products/${id}`);
}

export async function createProduct(req: ProductRequest): Promise<ProductResponse> {
  return api.post<ProductResponse>("/products", req);
}

export async function updateProduct(
  id: string,
  req: Partial<ProductRequest>
): Promise<ProductResponse> {
  return api.put<ProductResponse>(`/products/${id}`, req);
}

export async function deleteProduct(id: string): Promise<void> {
  return api.delete(`/products/${id}`);
}

export type ProductPerformerResponse = {
  businessUserId: string;
  fullName: string;
  active: boolean;
};

export type EligiblePerformerResponse = {
  businessUserId: string;
  fullName: string;
};

export async function getProductPerformers(
  productId: string
): Promise<ProductPerformerResponse[]> {
  return api.get<ProductPerformerResponse[]>(`/products/${productId}/performers`);
}

export async function replaceProductPerformers(
  productId: string,
  businessUserIds: string[]
): Promise<ProductPerformerResponse[]> {
  return api.put<ProductPerformerResponse[]>(`/products/${productId}/performers`, {
    businessUserIds,
  });
}

export async function listEligiblePerformers(
  storeId: string,
  productId: string
): Promise<EligiblePerformerResponse[]> {
  return api.get<EligiblePerformerResponse[]>(
    `/stores/${storeId}/products/${productId}/eligible-performers`
  );
}

/** Upload a product image; backend stores the file and returns the product with `imageUrl`. */
export async function uploadProductImageFile(
  productId: string,
  file: File
): Promise<ProductResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post<ProductResponse>(`/products/${productId}/image/upload`, formData);
}
