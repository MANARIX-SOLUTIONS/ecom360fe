/**
 * Subscription and plans API
 */

import { api } from "./client";

export type PlanResponse = {
  id: string;
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxStores: number;
  maxProducts: number;
  maxSalesPerMonth: number;
  maxClients: number;
  maxSuppliers: number;
  featureExpenses: boolean;
  featureReports: boolean;
  featureAdvancedReports: boolean;
  featureMultiPayment: boolean;
  featureExportPdf: boolean;
  featureExportExcel: boolean;
  featureClientCredits: boolean;
  featureSupplierTracking: boolean;
  featureRoleManagement: boolean;
  featureApi: boolean;
  featureCustomBranding: boolean;
  featurePrioritySupport: boolean;
  featureAccountManager: boolean;
  featureStockAlerts: boolean;
  featureDeliveryCouriers: boolean;
  featureGlobalView: boolean;
  dataRetentionMonths: number;
};

export type SubscriptionResponse = {
  id: string;
  planId: string;
  planSlug: string;
  planName: string;
  billingCycle: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
  daysRemaining?: number;
  isTrialing?: boolean;
};

export async function getSubscription(): Promise<SubscriptionResponse | undefined> {
  return api.get<SubscriptionResponse | undefined>("/subscription/me");
}

export async function listPlans(): Promise<PlanResponse[]> {
  return api.get<PlanResponse[]>("/subscription/plans");
}

export async function changePlan(
  planSlug: string,
  billingCycle: "monthly" | "yearly" = "monthly"
): Promise<SubscriptionResponse> {
  return api.post<SubscriptionResponse>("/subscription/change", { planSlug, billingCycle });
}

export async function cancelSubscription(atPeriodEnd = true): Promise<void> {
  return api.post("/subscription/cancel", { atPeriodEnd });
}

export async function reactivateSubscription(): Promise<SubscriptionResponse> {
  return api.post<SubscriptionResponse>("/subscription/reactivate");
}

export type SubscriptionUsageResponse = {
  usersCount: number;
  usersLimit: number;
  storesCount: number;
  storesLimit: number;
  productsCount: number;
  productsLimit: number;
  clientsCount: number;
  clientsLimit: number;
  suppliersCount: number;
  suppliersLimit: number;
  salesThisMonth: number;
  salesLimit: number;
};

const USAGE_TTL_MS = 10_000;
let usageCache: { at: number; data: SubscriptionUsageResponse } | null = null;
let usageInFlight: Promise<SubscriptionUsageResponse> | null = null;

export function invalidateSubscriptionUsageCache(): void {
  usageCache = null;
}

/** Deduped + short-TTL cache so concurrent page mounts share one GET /subscription/usage. */
export async function getSubscriptionUsage(): Promise<SubscriptionUsageResponse> {
  if (usageCache && Date.now() - usageCache.at < USAGE_TTL_MS) {
    return usageCache.data;
  }
  if (usageInFlight) return usageInFlight;
  usageInFlight = api
    .get<SubscriptionUsageResponse>("/subscription/usage")
    .then((data) => {
      usageCache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      usageInFlight = null;
    });
  return usageInFlight;
}

if (typeof window !== "undefined") {
  window.addEventListener("ecom360:plan-updated", invalidateSubscriptionUsageCache);
  window.addEventListener("ecom360:auth-expired", invalidateSubscriptionUsageCache);
}
