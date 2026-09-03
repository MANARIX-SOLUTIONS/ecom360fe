import { useEffect, useState } from "react";
import { useStore } from "@/hooks/useStore";

/**
 * Périmètre boutique local (VueGlobale / Rapports), indépendant du POS.
 * - 0 boutique : null
 * - 1 boutique assignée : force cet id (évite un GET sans storeId = tout le business)
 * - 2+ : null = toutes ; id invalide → reset à null
 */
export function useStoreScopeSelection() {
  const { stores, loading: storesLoading } = useStore();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (storesLoading) return;
    if (stores.length === 0) {
      if (selectedStoreId !== null) setSelectedStoreId(null);
      return;
    }
    if (stores.length === 1) {
      const onlyId = stores[0].id;
      if (selectedStoreId !== onlyId) setSelectedStoreId(onlyId);
      return;
    }
    if (selectedStoreId && !stores.some((s) => s.id === selectedStoreId)) {
      setSelectedStoreId(null);
    }
  }, [stores, storesLoading, selectedStoreId]);

  const showStoreScopeSelect = !storesLoading && stores.length > 1;
  /** true une fois le périmètre cohérent (évite un fetch « tout le business » avant le lock 1 boutique). */
  const storesReady =
    !storesLoading &&
    (stores.length === 0 || stores.length > 1 || selectedStoreId === stores[0]?.id);

  return {
    selectedStoreId,
    setSelectedStoreId,
    showStoreScopeSelect,
    storesReady,
    stores,
  };
}
