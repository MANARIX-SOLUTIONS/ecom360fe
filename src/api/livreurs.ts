/**
 * Delivery couriers (Livreurs) API — plan PRO
 */

import { api } from "./client";

export type CourierResponse = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CourierRequest = {
  name: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
};

export async function listCouriers(activeOnly = false): Promise<CourierResponse[]> {
  return api.get<CourierResponse[]>(`/delivery/couriers?activeOnly=${activeOnly}`);
}

export async function getCourier(id: string): Promise<CourierResponse> {
  return api.get<CourierResponse>(`/delivery/couriers/${id}`);
}

export async function createCourier(req: CourierRequest): Promise<CourierResponse> {
  return api.post<CourierResponse>("/delivery/couriers", req);
}

export async function updateCourier(
  id: string,
  req: Partial<CourierRequest>
): Promise<CourierResponse> {
  return api.put<CourierResponse>(`/delivery/couriers/${id}`, req);
}

export async function deleteCourier(id: string): Promise<void> {
  return api.delete(`/delivery/couriers/${id}`);
}
