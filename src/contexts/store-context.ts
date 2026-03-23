import { createContext } from "react";

export type Store = {
  id: string;
  name: string;
  address?: string;
};

export type StoreContextValue = {
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

export const StoreContext = createContext<StoreContextValue | null>(null);
