/**
 * Categories API
 */

import { api } from "./client";

export type CategoryResponse = {
  id: string;
  businessId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
};

export type CategoryRequest = {
  name: string;
  color?: string;
  sortOrder?: number;
};

export async function listCategories(): Promise<CategoryResponse[]> {
  return api.get<CategoryResponse[]>("/categories");
}

export async function createCategory(req: CategoryRequest): Promise<CategoryResponse> {
  return api.post<CategoryResponse>("/categories", req);
}

export async function updateCategory(
  id: string,
  req: Partial<CategoryRequest>
): Promise<CategoryResponse> {
  return api.put<CategoryResponse>(`/categories/${id}`, req);
}

export async function deleteCategory(id: string): Promise<void> {
  return api.delete(`/categories/${id}`);
}
