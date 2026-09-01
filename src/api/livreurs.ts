/**
 * Delivery couriers (Livreurs) API — plan PRO
 */

import { api } from "./client";
import { toQuery } from "./query";

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

export type CourierStatsResponse = {
  courierId: string;
  totalParcelsDelivered: number;
  totalDeliveries: number;
  failedDeliveries: number;
  successRatePercent: number;
};

export type DeliveryStatus = "delivered" | "failed" | "cancelled";

export type DeliveryRequest = {
  courierId: string;
  saleId?: string;
  status: DeliveryStatus;
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

export type ListCouriersParams = {
  activeOnly?: boolean;
};

export type ListDeliveriesParams = {
  courierId?: string;
  page?: number;
  size?: number;
};

export async function listCouriers(
  activeOnlyOrParams: boolean | ListCouriersParams = false
): Promise<CourierResponse[]> {
  const activeOnly =
    typeof activeOnlyOrParams === "boolean"
      ? activeOnlyOrParams
      : (activeOnlyOrParams.activeOnly ?? false);
  return api.get<CourierResponse[]>(
    `/delivery/couriers${toQuery({ activeOnly })}`
  );
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

export async function getCouriersStats(): Promise<CourierStatsResponse[]> {
  return api.get<CourierStatsResponse[]>("/delivery/couriers/stats");
}

export async function getCourierStats(
  courierId: string
): Promise<CourierStatsResponse> {
  return api.get<CourierStatsResponse>(
    `/delivery/couriers/${courierId}/stats`
  );
}

export async function createDelivery(
  req: DeliveryRequest
): Promise<DeliveryResponse> {
  return api.post<DeliveryResponse>("/delivery/deliveries", req);
}

export async function listDeliveries(
  params?: ListDeliveriesParams
): Promise<DeliveryResponse[]> {
  return api.get<DeliveryResponse[]>(
    `/delivery/deliveries${toQuery({
      courierId: params?.courierId,
      page: params?.page,
      size: params?.size,
    })}`
  );
}
