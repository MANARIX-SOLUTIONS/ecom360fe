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

export async function getSubscriptionUsage(): Promise<SubscriptionUsageResponse> {
  return api.get<SubscriptionUsageResponse>("/subscription/usage");
}
