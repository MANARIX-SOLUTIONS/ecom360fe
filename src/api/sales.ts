/**
 * Sales / POS API
 */

import { api } from "./client";
import type { PageResponse } from "./products";

export type SaleLineRequest = {
  productId: string;
  quantity: number;
};

export type SaleLineResponse = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

/** `paid` = soldée, `partial` = acompte versé, `unpaid` = rien encaissé. */
export type SalePaymentStatus = "paid" | "partial" | "unpaid";

export type SaleRequest = {
  storeId: string;
  clientId?: string | null;
  paymentMethod: string;
  discountAmount?: number;
  amountReceived?: number;
  /** Montant encaissé à la validation. Omis = tout encaissé, sauf en mode crédit. */
  amountPaid?: number;
  /** Échéance du solde, au format ISO yyyy-MM-dd. */
  dueDate?: string | null;
  note?: string;
  lines: SaleLineRequest[];
};

export type SaleResponse = {
  id: string;
  businessId: string;
  storeId: string;
  storeName?: string;
  storeAddress?: string;
  userId: string;
  clientId: string | null;
  receiptNumber: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: SalePaymentStatus;
  dueDate: string | null;
  amountReceived: number | null;
  changeGiven: number | null;
  status: string;
  note: string | null;
  lines: SaleLineResponse[];
  createdAt: string;
};

export type SalePaymentRequest = {
  amount: number;
  paymentMethod: string;
  note?: string;
};

export type SalePaymentResponse = {
  id: string;
  saleId: string;
  storeId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  kind: "deposit" | "installment";
  note: string | null;
  createdAt: string;
};

export async function createSale(req: SaleRequest): Promise<SaleResponse> {
  return api.post<SaleResponse>("/sales", req);
}

/** Met à jour une vente validée (même numéro de ticket / facture). */
export async function updateSale(id: string, req: SaleRequest): Promise<SaleResponse> {
  return api.put<SaleResponse>(`/sales/${id}`, req);
}

export async function getSale(id: string): Promise<SaleResponse> {
  return api.get<SaleResponse>(`/sales/${id}`);
}

export async function listSales(params?: {
  storeId?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: string;
  paymentStatus?: SalePaymentStatus;
  clientId?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SaleResponse>> {
  const search = new URLSearchParams();
  if (params?.storeId) search.set("storeId", params.storeId);
  if (params?.periodStart) search.set("periodStart", params.periodStart);
  if (params?.periodEnd) search.set("periodEnd", params.periodEnd);
  if (params?.status) search.set("status", params.status);
  if (params?.paymentStatus) search.set("paymentStatus", params.paymentStatus);
  if (params?.clientId) search.set("clientId", params.clientId);
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<PageResponse<SaleResponse>>(`/sales${qs ? `?${qs}` : ""}`);
}

export async function voidSale(id: string): Promise<SaleResponse> {
  return api.post<SaleResponse>(`/sales/${id}/void`);
}

/** Encaisse un versement sur le solde restant d'une vente. */
export async function recordSalePayment(
  saleId: string,
  req: SalePaymentRequest
): Promise<SalePaymentResponse> {
  return api.post<SalePaymentResponse>(`/sales/${saleId}/payments`, req);
}

export async function listSalePayments(saleId: string): Promise<SalePaymentResponse[]> {
  return api.get<SalePaymentResponse[]>(`/sales/${saleId}/payments`);
}

export type DigitalCheckoutChannel = "wave" | "orange_money";

export type DigitalCheckoutStatus =
  | "pending"
  | "paid"
  | "manual"
  | "failed"
  | "expired"
  | "cancelled";

export type DigitalCheckoutRequest = {
  storeId: string;
  clientId: string;
  channel: DigitalCheckoutChannel;
  discountAmount?: number;
  note?: string;
  lines: SaleLineRequest[];
};

export type DigitalCheckoutResponse = {
  intentId: string;
  status: DigitalCheckoutStatus;
  channel: DigitalCheckoutChannel;
  amount: number;
  currency: string;
  saleId: string;
  receiptNumber?: string;
  checkoutUrl?: string;
  /** Only while pending. */
  qrCode?: string;
  paymentLink?: string;
  ussdMessage?: string;
  expiresAt: string;
  failureReason?: string;
  /** Set once paid (or confirmed by hand), for the receipt. */
  sale?: SaleResponse;
};

export type DigitalCheckoutAvailability = {
  planAllowed: boolean;
  configured: boolean;
  available: boolean;
};

export const DIGITAL_CHECKOUT_SETTLED: DigitalCheckoutStatus[] = ["paid", "manual"];
export const DIGITAL_CHECKOUT_CLOSED: DigitalCheckoutStatus[] = ["failed", "expired", "cancelled"];

/** Paiement Wave / Orange Money vérifié via le compte Bictorys du commerce (plan Business). */
export async function startDigitalCheckout(
  req: DigitalCheckoutRequest
): Promise<DigitalCheckoutResponse> {
  return api.post<DigitalCheckoutResponse>("/sales/digital-checkout", req);
}

export async function getDigitalCheckout(intentId: string): Promise<DigitalCheckoutResponse> {
  return api.get<DigitalCheckoutResponse>(`/sales/digital-checkout/${intentId}`);
}

export async function cancelDigitalCheckout(intentId: string): Promise<DigitalCheckoutResponse> {
  return api.post<DigitalCheckoutResponse>(`/sales/digital-checkout/${intentId}/cancel`);
}

export async function confirmManualDigitalCheckout(
  intentId: string
): Promise<DigitalCheckoutResponse> {
  return api.post<DigitalCheckoutResponse>(`/sales/digital-checkout/${intentId}/confirm-manual`);
}

export async function getDigitalCheckoutAvailability(): Promise<DigitalCheckoutAvailability> {
  return api.get<DigitalCheckoutAvailability>("/sales/digital-checkout/availability");
}
