import { useCallback, useEffect, useState } from "react";
import { listSaleOutbox } from "@/offline/saleOutboxStore";
import { SALE_OUTBOX_CHANGED, type SaleOutboxItem } from "@/offline/saleOutboxTypes";
import { isSaleOutboxSyncing } from "@/offline/saleOutbox";

export type SaleOutboxSnapshot = {
  items: SaleOutboxItem[];
  pendingCount: number;
  failed: SaleOutboxItem[];
  syncing: boolean;
};

const EMPTY: SaleOutboxSnapshot = {
  items: [],
  pendingCount: 0,
  failed: [],
  syncing: false,
};

function toSnapshot(items: SaleOutboxItem[]): SaleOutboxSnapshot {
  const pending = items.filter((i) => i.status === "pending" || i.status === "syncing");
  return {
    items,
    pendingCount: pending.length,
    failed: items.filter((i) => i.status === "failed"),
    syncing: isSaleOutboxSyncing() || items.some((i) => i.status === "syncing"),
  };
}

export function useSaleOutbox(): SaleOutboxSnapshot {
  const [snap, setSnap] = useState<SaleOutboxSnapshot>(EMPTY);

  const refresh = useCallback(() => {
    void listSaleOutbox()
      .then((items) => setSnap(toSnapshot(items)))
      .catch(() => setSnap(EMPTY));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(SALE_OUTBOX_CHANGED, refresh);
    return () => window.removeEventListener(SALE_OUTBOX_CHANGED, refresh);
  }, [refresh]);

  return snap;
}
