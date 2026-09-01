import { ApiError } from "@/api/client";
import { createSale, type SaleRequest, type SaleResponse } from "@/api/sales";
import { t } from "@/i18n";
import { isBrowserOffline } from "./network";
import {
  deleteSaleOutboxItem,
  getSaleOutboxItem,
  listSaleOutbox,
  putSaleOutboxItem,
} from "./saleOutboxStore";
import { canEnqueueOffline, type SaleOutboxItem } from "./saleOutboxTypes";

const STOCK_INSUFFICIENT_MSG = "Stock insuffisant, ajuster";

export { STOCK_INSUFFICIENT_MSG };

export type EnqueueSaleInput = {
  payload: SaleRequest;
  businessId: string;
  userId: string;
};

export function newClientSaleId(): string {
  return crypto.randomUUID?.() ?? `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueSale(input: EnqueueSaleInput): Promise<SaleOutboxItem> {
  const method = input.payload.paymentMethod;
  if (!canEnqueueOffline(method)) {
    throw new Error(t.pos.digitalPaymentNeedsNetwork);
  }
  const clientSaleId = input.payload.clientSaleId ?? newClientSaleId();
  const existing = await getSaleOutboxItem(clientSaleId);
  if (existing) return existing;
  const item: SaleOutboxItem = {
    clientSaleId,
    businessId: input.businessId,
    userId: input.userId,
    storeId: input.payload.storeId,
    payload: { ...input.payload, clientSaleId },
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  await putSaleOutboxItem(item);
  return item;
}

export function classifySyncError(err: unknown): "failed" | "retry" {
  if (err instanceof ApiError) {
    if (err.status === 409) return "failed";
    if (err.status === 0 || err.status === 408 || err.status >= 500) return "retry";
    if (err.status === 401) return "retry";
    if (err.status >= 400 && err.status < 500) return "failed";
  }
  if (isBrowserOffline()) return "retry";
  return "retry";
}

export function syncErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) return STOCK_INSUFFICIENT_MSG;
  if (err instanceof Error && err.message) return err.message;
  return t.pos.paymentError;
}

let syncing = false;

export function isSaleOutboxSyncing(): boolean {
  return syncing;
}

export async function syncSaleOutbox(
  postSale: (req: SaleRequest) => Promise<SaleResponse> = createSale
): Promise<void> {
  if (syncing) return;
  if (isBrowserOffline()) return;
  syncing = true;
  try {
    const items = await listSaleOutbox();
    const queue = items.filter((i) => i.status === "pending" || i.status === "failed");
    for (const item of queue) {
      if (isBrowserOffline()) break;
      await putSaleOutboxItem({ ...item, status: "syncing", error: undefined });
      try {
        await postSale(item.payload);
        await deleteSaleOutboxItem(item.clientSaleId);
      } catch (err) {
        const next = classifySyncError(err);
        if (next === "retry") {
          await putSaleOutboxItem({
            ...item,
            status: "pending",
            error: syncErrorMessage(err),
          });
          break;
        }
        await putSaleOutboxItem({
          ...item,
          status: "failed",
          error: syncErrorMessage(err),
        });
      }
    }
  } finally {
    syncing = false;
  }
}

export function startSaleOutboxSync(): () => void {
  const run = () => {
    void syncSaleOutbox();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") run();
  };
  run();
  window.addEventListener("online", run);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener("online", run);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
