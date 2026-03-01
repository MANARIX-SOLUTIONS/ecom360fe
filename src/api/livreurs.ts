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

/** Performance stats for one courier */
export type CourierStatsResponse = {
  courierId: string;
  totalParcelsDelivered: number;
  totalDeliveries: number;
  failedDeliveries: number;
  successRatePercent: number;
};

export async function getCouriersStats(): Promise<CourierStatsResponse[]> {
  return api.get<CourierStatsResponse[]>("/delivery/couriers/stats");
}

export async function getCourierStats(courierId: string): Promise<CourierStatsResponse> {
  return api.get<CourierStatsResponse>(`/delivery/couriers/${courierId}/stats`);
}

/** Record a delivery (livraison) for performance tracking */
export type DeliveryRequest = {
  courierId: string;
  saleId?: string;
  status: "delivered" | "failed" | "cancelled";
  parcelsCount: number;
  notes?: string;
};

export type DeliveryResponse = {
  id: string;
  businessId: string;
  courierId: string;
  saleId: string | null;
  status: string;
  parcelsCount: number;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function createDelivery(req: DeliveryRequest): Promise<DeliveryResponse> {
  return api.post<DeliveryResponse>("/delivery/deliveries", req);
}

export async function listDeliveries(params?: {
  courierId?: string;
  page?: number;
  size?: number;
}): Promise<DeliveryResponse[]> {
  const search = new URLSearchParams();
  if (params?.courierId) search.set("courierId", params.courierId);
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<DeliveryResponse[]>(`/delivery/deliveries${qs ? `?${qs}` : ""}`);
}
