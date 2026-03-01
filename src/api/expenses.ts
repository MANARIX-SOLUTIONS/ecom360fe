/**
 * Expenses API
 */

import { api } from "./client";
import type { PageResponse } from "./products";

export type ExpenseCategoryResponse = {
  id: string;
  businessId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
};

export type ExpenseCategoryRequest = {
  name: string;
  color?: string;
  sortOrder?: number;
};

export type ExpenseResponse = {
  id: string;
  businessId: string;
  storeId: string | null;
  userId: string;
  categoryId: string;
  amount: number;
  description: string | null;
  expenseDate: string;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseRequest = {
  storeId?: string | null;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  receiptUrl?: string;
};

export async function listExpenseCategories(): Promise<ExpenseCategoryResponse[]> {
  return api.get<ExpenseCategoryResponse[]>("/expenses/categories");
}

export async function createExpenseCategory(
  req: ExpenseCategoryRequest
): Promise<ExpenseCategoryResponse> {
  return api.post<ExpenseCategoryResponse>("/expenses/categories", req);
}

export async function updateExpenseCategory(
  id: string,
  req: Partial<ExpenseCategoryRequest>
): Promise<ExpenseCategoryResponse> {
  return api.put<ExpenseCategoryResponse>(`/expenses/categories/${id}`, req);
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  return api.delete(`/expenses/categories/${id}`);
}

/** Fetches expense categories, creating defaults for new businesses when empty. */
export async function listExpenseCategoriesWithDefaults(): Promise<ExpenseCategoryResponse[]> {
  const list = await api.get<ExpenseCategoryResponse[]>("/expenses/categories");
  if (list.length > 0) return list;
  const defaults = [
    { name: "Achats marchandises", color: "blue" },
    { name: "Transport", color: "orange" },
    { name: "Loyer", color: "purple" },
    { name: "Salaires", color: "green" },
    { name: "Divers", color: "default" },
  ];
  for (const c of defaults) {
    await createExpenseCategory({ name: c.name, color: c.color });
  }
  return api.get<ExpenseCategoryResponse[]>("/expenses/categories");
}

export async function listExpenses(params?: {
  categoryId?: string;
  storeId?: string;
  month?: number;
  year?: number;
  page?: number;
  size?: number;
}): Promise<PageResponse<ExpenseResponse>> {
  const search = new URLSearchParams();
  if (params?.categoryId) search.set("categoryId", params.categoryId);
  if (params?.storeId) search.set("storeId", params.storeId);
  if (params?.month != null) search.set("month", String(params.month));
  if (params?.year != null) search.set("year", String(params.year));
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<PageResponse<ExpenseResponse>>(`/expenses${qs ? `?${qs}` : ""}`);
}

export async function createExpense(req: ExpenseRequest): Promise<ExpenseResponse> {
  return api.post<ExpenseResponse>("/expenses", req);
}

export async function updateExpense(
  id: string,
  req: Partial<ExpenseRequest>
): Promise<ExpenseResponse> {
  return api.put<ExpenseResponse>(`/expenses/${id}`, req);
}

export async function deleteExpense(id: string): Promise<void> {
  return api.delete(`/expenses/${id}`);
}
