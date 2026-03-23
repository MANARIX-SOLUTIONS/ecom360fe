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

/** Fetches categories, creating defaults for new businesses when empty. */
export async function listCategoriesWithDefaults(): Promise<CategoryResponse[]> {
  const list = await api.get<CategoryResponse[]>("/categories");
  if (list.length > 0) return list;
  const defaults = [
    { name: "Boissons", color: "blue" },
    { name: "Snacks", color: "green" },
    { name: "Divers", color: "default" },
  ];
  for (const c of defaults) {
    await createCategory({ name: c.name, color: c.color });
  }
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
