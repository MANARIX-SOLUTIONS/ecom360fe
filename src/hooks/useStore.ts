import { useContext, useEffect } from "react";
import { StoreContext } from "@/contexts/store-context";

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

const STORE_CHANGED_EVENT = "ecom360:store-changed";

/**
 * Appelle le callback à chaque changement de boutique (sélecteur global).
 * Utile pour refetch ou invalidation sans dépendre de activeStore?.id dans un useEffect.
 */
export function useOnStoreChange(callback: (storeId: string | null) => void) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ storeId: string | null }>).detail;
      callback(detail?.storeId ?? null);
    };
    window.addEventListener(STORE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(STORE_CHANGED_EVENT, handler);
  }, [callback]);
}
