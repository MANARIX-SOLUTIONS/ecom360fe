import type { SaleRequest } from "@/api/sales";

export type OutboxSaleStatus = "pending" | "syncing" | "failed";

export const OFFLINE_PAYMENT_METHODS = ["cash", "credit"] as const;

export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

export type SaleOutboxItem = {
  clientSaleId: string;
  businessId: string;
  userId: string;
  storeId: string;
  payload: SaleRequest;
  createdAt: string;
  status: OutboxSaleStatus;
  error?: string;
};

export const SALE_OUTBOX_CHANGED = "ecom360:sale-outbox-changed";

export function canEnqueueOffline(paymentMethod: string): paymentMethod is OfflinePaymentMethod {
  return (OFFLINE_PAYMENT_METHODS as readonly string[]).includes(paymentMethod);
}

export function notifySaleOutboxChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SALE_OUTBOX_CHANGED));
}
