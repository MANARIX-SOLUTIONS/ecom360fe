/**
 * Suppliers API
 */

import { api } from "./client";
import type { PageResponse } from "./products";

export type SupplierResponse = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  zone: string | null;
  address: string | null;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierRequest = {
  name: string;
  phone?: string;
  email?: string;
  zone?: string;
  address?: string;
  isActive?: boolean;
};

export type SupplierPaymentResponse = {
  id: string;
  supplierId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  note: string | null;
  createdAt: string;
};

export type SupplierPaymentRequest = {
  amount: number;
  paymentMethod: string;
  note?: string;
};

export async function listSuppliers(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<SupplierResponse>> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<PageResponse<SupplierResponse>>(`/suppliers${qs ? `?${qs}` : ""}`);
}

export async function getSupplier(id: string): Promise<SupplierResponse> {
  return api.get<SupplierResponse>(`/suppliers/${id}`);
}

export async function createSupplier(req: SupplierRequest): Promise<SupplierResponse> {
  return api.post<SupplierResponse>("/suppliers", req);
}

export async function updateSupplier(
  id: string,
  req: Partial<SupplierRequest>
): Promise<SupplierResponse> {
  return api.put<SupplierResponse>(`/suppliers/${id}`, req);
}

export async function deleteSupplier(id: string): Promise<void> {
  return api.delete(`/suppliers/${id}`);
}

export async function recordSupplierPayment(
  supplierId: string,
  req: SupplierPaymentRequest
): Promise<SupplierPaymentResponse> {
  return api.post<SupplierPaymentResponse>(`/suppliers/${supplierId}/payments`, req);
}

export async function listSupplierPayments(
  supplierId: string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<SupplierPaymentResponse>> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<PageResponse<SupplierPaymentResponse>>(
    `/suppliers/${supplierId}/payments${qs ? `?${qs}` : ""}`
  );
}
