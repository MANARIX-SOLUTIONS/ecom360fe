import { notifySaleOutboxChanged, type SaleOutboxItem } from "./saleOutboxTypes";

const DB_NAME = "ecom360-offline";
const DB_VERSION = 1;
const STORE = "sale_outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "clientSaleId" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function putSaleOutboxItem(item: SaleOutboxItem): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(item);
  await txDone(tx);
  notifySaleOutboxChanged();
}

export async function getSaleOutboxItem(clientSaleId: string): Promise<SaleOutboxItem | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(clientSaleId);
    req.onsuccess = () => resolve(req.result as SaleOutboxItem | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function listSaleOutbox(): Promise<SaleOutboxItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const items = (req.result as SaleOutboxItem[]) ?? [];
      items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSaleOutboxItem(clientSaleId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(clientSaleId);
  await txDone(tx);
  notifySaleOutboxChanged();
}

export async function clearSaleOutbox(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await txDone(tx);
  notifySaleOutboxChanged();
}
