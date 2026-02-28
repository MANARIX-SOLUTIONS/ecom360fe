/**
 * Backoffice API - platform admin endpoints.
 * Requires PLATFORM_ADMIN role.
 */

import { api } from "./client";
import type { PageResponse } from "./products";

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
  revenue: string;
  createdAt: string;
  trialEndsAt?: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  business: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AdminStats = {
  businessesCount: number;
  usersCount: number;
  storesCount: number;
  monthlyRevenue: number;
  planDistribution: { plan: string; count: number; pct: number }[];
  topBusinesses: {
    name: string;
    owner: string;
    revenue: number;
    storesCount: number;
    plan: string;
  }[];
};

export async function getAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>("/admin/stats");
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

export type AdminPlanItem = {
  id: string;
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
};

export async function listAdminPlans(): Promise<AdminPlanItem[]> {
  return api.get<AdminPlanItem[]>("/admin/businesses/plans");
}

export async function setBusinessStatus(
  businessId: string,
  status: "active" | "suspended"
): Promise<void> {
  await api.patch(`/admin/businesses/${businessId}/status`, { status });
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

export async function listAdminAuditLogs(params?: {
  page?: number;
  size?: number;
  businessId?: string;
  entityType?: string;
  userId?: string;
}): Promise<PageResponse<AuditLogEntry>> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.size != null) searchParams.set("size", String(params.size));
  if (params?.businessId) searchParams.set("businessId", params.businessId);
  if (params?.entityType) searchParams.set("entityType", params.entityType);
  if (params?.userId) searchParams.set("userId", params.userId);
  const q = searchParams.toString();
  return api.get<PageResponse<AuditLogEntry>>(`/admin/audit-logs${q ? `?${q}` : ""}`);
}
