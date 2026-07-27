const KEY_PREFIX = "ecom360_pos_cart_";

export type PosCartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

function storageKey(storeId: string): string {
  return `${KEY_PREFIX}${storeId}`;
}

function isPosCartLine(value: unknown): value is PosCartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.id === "string" &&
    typeof line.name === "string" &&
    typeof line.price === "number" &&
    typeof line.qty === "number" &&
    line.qty > 0
  );
}

export function loadPosCart(storeId: string): PosCartLine[] {
  if (!storeId) return [];
  try {
    const raw = localStorage.getItem(storageKey(storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPosCartLine);
  } catch {
    return [];
  }
}

export function savePosCart(storeId: string, cart: PosCartLine[]): void {
  if (!storeId) return;
  if (cart.length === 0) {
    clearPosCart(storeId);
    return;
  }
  localStorage.setItem(storageKey(storeId), JSON.stringify(cart));
}

export function clearPosCart(storeId: string): void {
  if (!storeId) return;
  localStorage.removeItem(storageKey(storeId));
}

export function clearAllPosCarts(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(KEY_PREFIX)) keysToRemove.push(key);
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
