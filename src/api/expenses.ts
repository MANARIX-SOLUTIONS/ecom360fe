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

export async function listExpenses(params?: {
  categoryId?: string;
  storeId?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<ExpenseResponse>> {
  const search = new URLSearchParams();
  if (params?.categoryId) search.set("categoryId", params.categoryId);
  if (params?.storeId) search.set("storeId", params.storeId);
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
