/**
 * Hook to check if the user is at plan limit for a given resource.
 * Used to disable add buttons and show upgrade prompt.
 */
import { useState, useEffect } from "react";
import { getSubscriptionUsage, type SubscriptionUsageResponse } from "@/api";

type LimitKey = "users" | "stores" | "products" | "clients" | "suppliers";

function checkLimit(
  u: SubscriptionUsageResponse,
  key: LimitKey,
): { atLimit: boolean; usage: string | null } {
  const map: Record<
    LimitKey,
    [keyof SubscriptionUsageResponse, keyof SubscriptionUsageResponse]
  > = {
    users: ["usersCount", "usersLimit"],
    stores: ["storesCount", "storesLimit"],
    products: ["productsCount", "productsLimit"],
    clients: ["clientsCount", "clientsLimit"],
    suppliers: ["suppliersCount", "suppliersLimit"],
  };
  const [countKey, limitKey] = map[key];
  const c = u[countKey] as number;
  const l = u[limitKey] as number;
  if (l > 0 && c >= l) return { atLimit: true, usage: `${c} / ${l}` };
  return { atLimit: false, usage: l > 0 ? `${c} / ${l}` : null };
}

export function usePlanLimit(key: LimitKey) {
  const [atLimit, setAtLimit] = useState(false);
  const [usage, setUsage] = useState<string | null>(null);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) => {
        const r = checkLimit(u, key);
        setAtLimit(r.atLimit);
        setUsage(r.usage);
      })
      .catch(() => {
        setAtLimit(false);
        setUsage(null);
      });
  }, [key]);

  return { atLimit, usage };
}
