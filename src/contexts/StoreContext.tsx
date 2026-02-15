import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from "react";
import { listStores, createStore, updateStore as apiUpdateStore, deleteStore } from "@/api";
import type { StoreResponse } from "@/api";

const ACTIVE_STORE_KEY = "ecom360_active_store_id";

export type Store = {
  id: string;
  name: string;
  address?: string;
};

type StoreContextValue = {
  stores: Store[];
  activeStore: Store | null;
  setActiveStoreId: (id: string | null) => void;
  addStore: (store: Omit<Store, "id">) => Promise<Store>;
  updateStore: (id: string, updates: Partial<Pick<Store, "name" | "address">>) => Promise<void>;
  removeStore: (id: string) => Promise<void>;
  hasStores: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_STORE_KEY);
}

function saveActiveId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_STORE_KEY, id);
  else localStorage.removeItem(ACTIVE_STORE_KEY);
}

function toStore(r: StoreResponse): Store {
  return { id: r.id, name: r.name, address: r.address ?? undefined };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(() => loadActiveId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = !!localStorage.getItem("ecom360_access_token");

  const fetchStores = useCallback(async () => {
    if (!hasAuth) {
      setStores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listStores();
      setStores(list.map(toStore));
      const saved = loadActiveId();
      if (saved && !list.some((s) => s.id === saved)) {
        saveActiveId(list[0]?.id ?? null);
        setActiveIdState(list[0]?.id ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement boutiques");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [hasAuth]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const activeStore = activeId ? (stores.find((s) => s.id === activeId) ?? null) : null;

  const setActiveStoreId = useCallback((id: string | null) => {
    setActiveIdState(id);
    saveActiveId(id);
  }, []);

  const addStore = useCallback(
    async (store: Omit<Store, "id">): Promise<Store> => {
      if (!hasAuth) {
        const fallback: Store = { ...store, id: `local_${Date.now()}` };
        setStores((prev) => [...prev, fallback]);
        setActiveStoreId(fallback.id);
        return fallback;
      }
      const created = await createStore({ name: store.name, address: store.address });
      const s = toStore(created);
      setStores((prev) => [...prev, s]);
      setActiveStoreId(s.id);
      return s;
    },
    [hasAuth, setActiveStoreId]
  );

  const updateStore = useCallback(
    async (id: string, updates: Partial<Pick<Store, "name" | "address">>) => {
      if (!hasAuth) {
        setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
        return;
      }
      await apiUpdateStore(id, updates);
      setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    },
    [hasAuth]
  );

  const removeStore = useCallback(
    async (id: string) => {
      const remaining = stores.filter((s) => s.id !== id);
      if (hasAuth) {
        await deleteStore(id);
      }
      setStores(remaining);
      if (activeId === id) setActiveStoreId(remaining[0]?.id ?? null);
    },
    [hasAuth, activeId, stores, setActiveStoreId]
  );

  const value: StoreContextValue = {
    stores,
    activeStore,
    setActiveStoreId,
    addStore,
    updateStore,
    removeStore,
    hasStores: stores.length > 0,
    loading,
    error,
    refetch: fetchStores,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
