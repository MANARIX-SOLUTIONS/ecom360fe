/**
 * Backoffice API - platform admin endpoints.
 * Requires PLATFORM_ADMIN role.
 */

import { api } from './client'

export type AdminBusiness = {
  id: string
  name: string
  owner: string
  email: string
  phone: string
  address: string
  plan: string
  status: string
  storesCount: number
  revenue: string
  createdAt: string
  trialEndsAt?: string
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  business: string
  status: string
  lastLoginAt: string | null
  createdAt: string
}

export type AdminStats = {
  businessesCount: number
  usersCount: number
  storesCount: number
  monthlyRevenue: number
  planDistribution: { plan: string; count: number; pct: number }[]
  topBusinesses: { name: string; owner: string; revenue: number; storesCount: number; plan: string }[]
}

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  hasNext: boolean
  hasPrevious: boolean
}

export async function getAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>('/admin/stats')
}

export async function listAdminBusinesses(params?: {
  page?: number
  size?: number
  search?: string
  status?: string
  plan?: string
}): Promise<PageResponse<AdminBusiness>> {
  const searchParams = new URLSearchParams()
  if (params?.page != null) searchParams.set('page', String(params.page))
  if (params?.size != null) searchParams.set('size', String(params.size))
  if (params?.search) searchParams.set('search', params.search)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.plan) searchParams.set('plan', params.plan)
  const q = searchParams.toString()
  return api.get<PageResponse<AdminBusiness>>(`/admin/businesses${q ? `?${q}` : ''}`)
}

export async function setBusinessStatus(businessId: string, status: 'active' | 'suspended'): Promise<void> {
  await api.patch(`/admin/businesses/${businessId}/status`, { status })
}

export async function listAdminUsers(params?: {
  page?: number
  size?: number
  search?: string
  status?: string
  role?: string
}): Promise<PageResponse<AdminUser>> {
  const searchParams = new URLSearchParams()
  if (params?.page != null) searchParams.set('page', String(params.page))
  if (params?.size != null) searchParams.set('size', String(params.size))
  if (params?.search) searchParams.set('search', params.search)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.role) searchParams.set('role', params.role)
  const q = searchParams.toString()
  return api.get<PageResponse<AdminUser>>(`/admin/users${q ? `?${q}` : ''}`)
}

export async function setUserStatus(userId: string, active: boolean): Promise<void> {
  await api.patch(`/admin/users/${userId}/status`, { active })
}

export async function inviteAdminUser(params: {
  email: string
  fullName: string
  role: string
  businessId: string
}): Promise<AdminUser> {
  return api.post<AdminUser>('/admin/users/invite', params)
}
