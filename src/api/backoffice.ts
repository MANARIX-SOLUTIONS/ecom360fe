/**
 * Backoffice API - platform admin endpoints.
 * Requires PLATFORM_ADMIN role.
 */

import { api } from "./client";
import type { PageResponse } from "./products";
import type { StoreRequest, StoreResponse } from "./stores";
import type { SubscriptionUsageResponse } from "./subscription";

/** Détails du dernier abonnement (tous statuts), renvoyés par l'API admin entreprises. */
export type AdminBusinessSubscriptionInfo = {
  planSlug: string;
  planName: string;
  billingCycle: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  daysRemaining: number;
  cancelAtPeriodEnd: boolean;
  trialing: boolean;
  amount?: number;
  currency?: string;
};

export type AdminBusiness = {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  status: string;
  storesCount: number;
  usersCount?: number;
  revenue: string;
  createdAt: string;
  trialEndsAt?: string;
  subscription?: AdminBusinessSubscriptionInfo | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  business: string;
  businessId?: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AdminStats = {
  businessesCount: number;
  usersCount: number;
  storesCount: number;
  /** Merchant POS GMV for the selected period. */
  monthlyRevenue: number;
  planDistribution: { plan: string; count: number; pct: number }[];
  topBusinesses: {
    name: string;
    owner: string;
    revenue: number;
    storesCount: number;
    plan: string;
    id?: string;
    subscriptionAmount?: number;
    subscriptionStatus?: string;
  }[];
  activeBusinessesCount?: number;
  pendingDemoRequestsCount?: number;
  activeSubscriptionsCount?: number;
  mrr?: number;
  saasCollected?: number;
  saasOutstanding?: number;
  failedPaymentsCount?: number;
  failedPaymentsAmount?: number;
  successfulPaymentsCount?: number;
  paymentAttemptsCount?: number;
  previousPeriodCollected?: number;
  previousPeriodMerchantRevenue?: number;
  currency?: string;
  periodFrom?: string;
  periodTo?: string;
  generatedAt?: string;
};

export type AdminRevenuePoint = {
  date: string;
  collected: number;
  outstanding: number;
  failed: number;
};

export type AdminRevenueSeries = {
  currency: string;
  periodFrom: string;
  periodTo: string;
  points: AdminRevenuePoint[];
};

export async function getAdminStats(params?: { from?: string; to?: string }): Promise<AdminStats> {
  const searchParams = new URLSearchParams();
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  const q = searchParams.toString();
  return api.get<AdminStats>(`/admin/stats${q ? `?${q}` : ""}`);
}

export async function getAdminRevenue(params?: {
  from?: string;
  to?: string;
}): Promise<AdminRevenueSeries> {
  const searchParams = new URLSearchParams();
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  const q = searchParams.toString();
  return api.get<AdminRevenueSeries>(`/admin/stats/revenue${q ? `?${q}` : ""}`);
}

export async function listAdminBusinesses(params?: {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  plan?: string;
}): Promise<PageResponse<AdminBusiness>> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.size != null) searchParams.set("size", String(params.size));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.plan) searchParams.set("plan", params.plan);
  const q = searchParams.toString();
  return api.get<PageResponse<AdminBusiness>>(`/admin/businesses${q ? `?${q}` : ""}`);
}

export async function getAdminBusiness(businessId: string): Promise<AdminBusiness> {
  return api.get<AdminBusiness>(`/admin/businesses/${businessId}`);
}

export async function getAdminBusinessSubscriptionUsage(
  businessId: string
): Promise<SubscriptionUsageResponse> {
  return api.get<SubscriptionUsageResponse>(`/admin/businesses/${businessId}/subscription/usage`);
}

export async function listAdminBusinessStores(businessId: string): Promise<StoreResponse[]> {
  return api.get<StoreResponse[]>(`/admin/businesses/${businessId}/stores`);
}

export async function createAdminBusinessStore(
  businessId: string,
  payload: StoreRequest
): Promise<StoreResponse> {
  return api.post<StoreResponse>(`/admin/businesses/${businessId}/stores`, payload);
}

export async function updateAdminBusinessStore(
  businessId: string,
  storeId: string,
  payload: StoreRequest
): Promise<StoreResponse> {
  return api.put<StoreResponse>(`/admin/businesses/${businessId}/stores/${storeId}`, payload);
}

export async function deleteAdminBusinessStore(businessId: string, storeId: string): Promise<void> {
  await api.delete(`/admin/businesses/${businessId}/stores/${storeId}`);
}

export type AdminCreateBusinessPayload = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  /** Plan slug (e.g. pro, starter). Omit or "trial" for trial. */
  planSlug?: string;
  /** Link this user as propriétaire. */
  ownerUserId?: string;
};

export async function createAdminBusiness(
  payload: AdminCreateBusinessPayload
): Promise<AdminBusiness> {
  return api.post<AdminBusiness>("/admin/businesses", payload);
}

export type AdminUpdateBusinessPayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export async function updateAdminBusiness(
  businessId: string,
  payload: AdminUpdateBusinessPayload
): Promise<AdminBusiness> {
  return api.patch<AdminBusiness>(`/admin/businesses/${businessId}`, payload);
}

export type AdminAssignPlanPayload = {
  planSlug: string;
  billingCycle?: string;
};

export async function assignAdminBusinessPlan(
  businessId: string,
  payload: AdminAssignPlanPayload
): Promise<void> {
  await api.patch(`/admin/businesses/${businessId}/plan`, payload);
}

export type AdminRenewSubscriptionPayload = {
  planSlug?: string;
  billingCycle?: string;
};

/** Ajoute une période (mensuelle ou annuelle) — empilée après la fin de période si abonnement payant actif. */
export async function renewAdminBusinessSubscription(
  businessId: string,
  payload?: AdminRenewSubscriptionPayload
): Promise<void> {
  await api.post(`/admin/businesses/${businessId}/subscription/renew`, payload ?? {});
}

export type AdminPlanItem = {
  id: string;
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxStores?: number;
  maxUsers?: number;
  maxProducts?: number;
  maxSalesPerMonth?: number;
  maxClients?: number;
  maxSuppliers?: number;
  dataRetentionMonths?: number;
  active?: boolean;
  subscribedCompanies?: number;
  entitlements?: string[];
  features?: Record<string, boolean>;
};

export type AdminPlanUpdate = {
  priceMonthly?: number;
  priceYearly?: number;
  maxUsers?: number;
  maxStores?: number;
  maxProducts?: number;
  maxSalesPerMonth?: number;
  maxClients?: number;
  maxSuppliers?: number;
  dataRetentionMonths?: number;
  active?: boolean;
  features?: Record<string, boolean>;
};

export type AdminBusinessFeature = {
  key: string;
  label: string;
  planEnabled: boolean;
  override: boolean | null;
  effective: boolean;
};

export async function listAdminPlans(): Promise<AdminPlanItem[]> {
  return api.get<AdminPlanItem[]>("/admin/businesses/plans");
}

export async function updateAdminPlan(
  planId: string,
  payload: AdminPlanUpdate
): Promise<AdminPlanItem> {
  return api.patch<AdminPlanItem>(`/admin/businesses/plans/${planId}`, payload);
}

export async function listAdminBusinessFeatures(
  businessId: string
): Promise<AdminBusinessFeature[]> {
  return api.get<AdminBusinessFeature[]>(`/admin/businesses/${businessId}/features`);
}

export async function replaceAdminBusinessFeatures(
  businessId: string,
  overrides: Record<string, boolean | null>
): Promise<AdminBusinessFeature[]> {
  return api.put<AdminBusinessFeature[]>(`/admin/businesses/${businessId}/features`, {
    overrides,
  });
}

export async function setBusinessStatus(
  businessId: string,
  status: "active" | "suspended"
): Promise<void> {
  await api.patch(`/admin/businesses/${businessId}/status`, { status });
}

/** Membres d'une entreprise (backoffice) */
export type AdminBusinessMember = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  roleCode: string;
  roleName: string;
  active: boolean;
  /** Permissions effectives du rôle assigné */
  permissions: string[];
};

export type AdminBusinessRoleOption = {
  id: string;
  code: string;
  name: string;
  system: boolean;
  permissions: string[];
};

export async function listAdminBusinessMembers(businessId: string): Promise<AdminBusinessMember[]> {
  return api.get<AdminBusinessMember[]>(`/admin/businesses/${businessId}/members`);
}

export async function listAdminBusinessRoleOptions(
  businessId: string
): Promise<AdminBusinessRoleOption[]> {
  return api.get<AdminBusinessRoleOption[]>(`/admin/businesses/${businessId}/roles`);
}

export async function updateAdminBusinessMemberRole(
  businessId: string,
  businessUserId: string,
  roleCode: string
): Promise<AdminBusinessMember> {
  return api.patch<AdminBusinessMember>(
    `/admin/businesses/${businessId}/members/${businessUserId}/role`,
    { roleCode }
  );
}

/** Remplace les permissions d'un rôle pour cette entreprise (équivalent Paramètres → Rôles). */
export async function updateAdminBusinessRolePermissions(
  businessId: string,
  roleId: string,
  permissionCodes: string[]
): Promise<AdminBusinessRoleOption> {
  return api.patch<AdminBusinessRoleOption>(
    `/admin/businesses/${businessId}/roles/${roleId}/permissions`,
    { permissionCodes }
  );
}

export async function getAdminUser(userId: string): Promise<AdminUser> {
  return api.get<AdminUser>(`/admin/users/${userId}`);
}

export async function listAdminUsers(params?: {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  role?: string;
}): Promise<PageResponse<AdminUser>> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.size != null) searchParams.set("size", String(params.size));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.role) searchParams.set("role", params.role);
  const q = searchParams.toString();
  return api.get<PageResponse<AdminUser>>(`/admin/users${q ? `?${q}` : ""}`);
}

export async function setUserStatus(userId: string, active: boolean): Promise<void> {
  await api.patch(`/admin/users/${userId}/status`, { active });
}

export async function inviteAdminUser(params: {
  email: string;
  fullName: string;
  role: string;
  businessId: string;
}): Promise<AdminUser> {
  return api.post<AdminUser>("/admin/users/invite", params);
}

export async function sendAdminUserPasswordReset(userId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/password-reset`);
}

export type AuditLogEntry = {
  id: string;
  businessId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
};

export type AdminDemoRequest = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  businessName: string;
  message: string | null;
  jobTitle: string | null;
  city: string | null;
  sector: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
};

export async function listAdminDemoRequests(params?: {
  page?: number;
  size?: number;
  status?: string;
  search?: string;
}): Promise<PageResponse<AdminDemoRequest>> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.size != null) searchParams.set("size", String(params.size));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  const q = searchParams.toString();
  return api.get<PageResponse<AdminDemoRequest>>(`/admin/demo-requests${q ? `?${q}` : ""}`);
}

export type DemoApproveResult = {
  requestId: string;
  businessId: string;
  userId: string;
  email: string;
  businessName: string;
};

export async function approveAdminDemoRequest(id: string): Promise<DemoApproveResult> {
  return api.post<DemoApproveResult>(`/admin/demo-requests/${id}/approve`);
}

export async function rejectAdminDemoRequest(id: string, reason?: string): Promise<void> {
  await api.post(`/admin/demo-requests/${id}/reject`, { reason: reason ?? null });
}

export type AdminSubscriptionPayment = {
  intentId: string;
  businessId: string;
  businessName?: string;
  planId: string;
  planSlug?: string;
  planName?: string;
  billingCycle: string;
  amount: number;
  currency: string;
  provider: string;
  channel: string;
  status: string;
  externalToken?: string;
  externalRef?: string;
  checkoutUrl?: string;
  subscriptionId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
  createdByUserId?: string;
};

export async function listAdminSubscriptionPayments(params?: {
  page?: number;
  size?: number;
  businessId?: string;
  status?: string;
  provider?: string;
  channel?: string;
  from?: string;
  to?: string;
}): Promise<PageResponse<AdminSubscriptionPayment>> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.size != null) searchParams.set("size", String(params.size));
  if (params?.businessId) searchParams.set("businessId", params.businessId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.provider) searchParams.set("provider", params.provider);
  if (params?.channel) searchParams.set("channel", params.channel);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  const q = searchParams.toString();
  return api.get<PageResponse<AdminSubscriptionPayment>>(
    `/admin/subscription-payments${q ? `?${q}` : ""}`
  );
}

export async function markAdminSubscriptionPaymentPaid(
  intentId: string,
  note?: string
): Promise<AdminSubscriptionPayment> {
  return api.post<AdminSubscriptionPayment>(`/admin/subscription-payments/${intentId}/mark-paid`, {
    note: note ?? null,
  });
}

export type LandingStatus = {
  loading: boolean;
};

export async function getLandingStatus(): Promise<LandingStatus> {
  return api.get<LandingStatus>("/admin/platform/landing-status");
}

export async function updateLandingStatus(loading: boolean): Promise<LandingStatus> {
  return api.put<LandingStatus>("/admin/platform/landing-status", { loading });
}

export async function listAdminAuditLogs(params?: {
  page?: number;
  size?: number;
  businessId?: string;
  entityType?: string;
  userId?: string;
  action?: string;
  requestId?: string;
  from?: string;
  to?: string;
}): Promise<PageResponse<AuditLogEntry>> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.size != null) searchParams.set("size", String(params.size));
  if (params?.businessId) searchParams.set("businessId", params.businessId);
  if (params?.entityType) searchParams.set("entityType", params.entityType);
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.action) searchParams.set("action", params.action);
  if (params?.requestId) searchParams.set("requestId", params.requestId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  const q = searchParams.toString();
  return api.get<PageResponse<AuditLogEntry>>(`/admin/audit-logs${q ? `?${q}` : ""}`);
}

export type AdminFeatureFlag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  updatedAt: string;
};

export async function listAdminFeatureFlags(): Promise<AdminFeatureFlag[]> {
  return api.get<AdminFeatureFlag[]>("/admin/system/features");
}

export async function updateAdminFeatureFlag(
  key: string,
  enabled: boolean
): Promise<AdminFeatureFlag> {
  return api.patch<AdminFeatureFlag>(`/admin/system/features/${key}`, { enabled });
}

export type AdminServiceHealth = {
  key: string;
  label: string;
  status: "healthy" | "degraded" | "down" | "unknown" | string;
  detail: string;
};

export type AdminSystemHealth = {
  generatedAt: string;
  overall: string;
  services: AdminServiceHealth[];
};

export async function getAdminSystemHealth(): Promise<AdminSystemHealth> {
  return api.get<AdminSystemHealth>("/admin/system/health");
}

export type AdminInvoice = {
  id: string;
  number: string;
  businessId: string;
  businessName: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  provider: string | null;
  externalRef: string | null;
  paymentIntentId: string | null;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
};

export async function listAdminInvoices(params?: {
  page?: number;
  size?: number;
  businessId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}): Promise<PageResponse<AdminInvoice>> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.size != null) searchParams.set("size", String(params.size));
  if (params?.businessId) searchParams.set("businessId", params.businessId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  const q = searchParams.toString();
  return api.get<PageResponse<AdminInvoice>>(`/admin/invoices${q ? `?${q}` : ""}`);
}

export type AdminStoreListItem = {
  id: string;
  businessId: string;
  businessName: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
};

export async function listAdminStores(params?: {
  page?: number;
  size?: number;
  search?: string;
  active?: boolean;
}): Promise<PageResponse<AdminStoreListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.size != null) searchParams.set("size", String(params.size));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.active != null) searchParams.set("active", String(params.active));
  const q = searchParams.toString();
  return api.get<PageResponse<AdminStoreListItem>>(`/admin/stores${q ? `?${q}` : ""}`);
}

export type AdminSearchResponse = {
  companies: { id: string; name: string; email: string; status: string }[];
  users: { id: string; name: string; email: string; status: string }[];
  invoices: { id: string; number: string; businessId: string; status: string; amount: number }[];
  payments: {
    intentId: string;
    businessId: string;
    status: string;
    amount: number;
    externalRef: string | null;
  }[];
  audit: { id: string; action: string; entityType: string; requestId: string | null }[];
  stores?: {
    id: string;
    businessId: string;
    name: string;
    businessName: string;
    active: boolean;
  }[];
};

export async function searchAdmin(query: string): Promise<AdminSearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", query);
  return api.get<AdminSearchResponse>(`/admin/search?${searchParams.toString()}`);
}

export type AdminMaintenanceResult = {
  targetedBusinesses: number;
  mailedBusinesses: number;
  inAppRecipients: number;
};

export async function sendAdminMaintenanceNotification(payload: {
  title: string;
  message: string;
  statusPageUrl?: string;
}): Promise<AdminMaintenanceResult> {
  return api.post<AdminMaintenanceResult>("/admin/notifications/maintenance", payload);
}
