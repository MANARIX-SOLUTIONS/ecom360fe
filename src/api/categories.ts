/**
 * Categories API
 */

import { api } from "./client";

export type CategoryResponse = {
  id: string;
  businessId: string;
  parentId: string | null;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
};

export type CategoryRequest = {
  name: string;
  color?: string;
  sortOrder?: number;
  parentId?: string | null;
};

export type CategoryTreeNode = CategoryResponse & {
  children: CategoryTreeNode[];
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

export function getRootCategories(categories: CategoryResponse[]): CategoryResponse[] {
  return categories.filter((c) => !c.parentId);
}

export function getChildCategories(
  categories: CategoryResponse[],
  parentId: string
): CategoryResponse[] {
  return categories.filter((c) => c.parentId === parentId);
}

export function hasChildCategories(
  categories: CategoryResponse[],
  categoryId: string
): boolean {
  return categories.some((c) => c.parentId === categoryId);
}

export function isLeafCategory(
  categories: CategoryResponse[],
  categoryId: string
): boolean {
  return !hasChildCategories(categories, categoryId);
}

export function buildCategoryTree(categories: CategoryResponse[]): CategoryTreeNode[] {
  const roots = getRootCategories(categories).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
  return roots.map((root) => ({
    ...root,
    children: getChildCategories(categories, root.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((child) => ({ ...child, children: [] })),
  }));
}

/** TreeSelect options: only leaf categories are selectable. */
export function getCategoryTreeSelectOptions(categories: CategoryResponse[]) {
  return buildCategoryTree(categories).map((root) => {
    if (root.children.length === 0) {
      return { value: root.id, title: root.name, selectable: true };
    }
    return {
      value: root.id,
      title: root.name,
      selectable: false,
      children: root.children.map((child) => ({
        value: child.id,
        title: child.name,
        selectable: true,
      })),
    };
  });
}

export function getCategoryLabel(
  categories: CategoryResponse[],
  categoryId: string | null | undefined
): string {
  if (!categoryId) return "-";
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return "-";
  if (cat.parentId) {
    const parent = categories.find((c) => c.id === cat.parentId);
    return parent ? `${parent.name} › ${cat.name}` : cat.name;
  }
  return cat.name;
}

/** Resolve category IDs included when filtering (parent includes all children). */
export function resolveCategoryFilterIds(
  categories: CategoryResponse[],
  filterCategoryId: string
): Set<string> {
  const childIds = getChildCategories(categories, filterCategoryId).map((c) => c.id);
  if (childIds.length > 0) {
    return new Set(childIds);
  }
  return new Set([filterCategoryId]);
}
