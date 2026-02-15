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

export async function listAdminBusinesses(params?: {
  page?: number
  size?: number
  status?: string
  plan?: string
}): Promise<PageResponse<AdminBusiness>> {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.size != null) search.set('size', String(params.size))
  if (params?.status) search.set('status', params.status)
  if (params?.plan) search.set('plan', params.plan)
  const q = search.toString()
  return api.get<PageResponse<AdminBusiness>>(`/admin/businesses${q ? `?${q}` : ''}`)
}

export async function setBusinessStatus(businessId: string, status: 'active' | 'suspended'): Promise<void> {
  await api.patch(`/admin/businesses/${businessId}/status`, { status })
}

export async function listAdminUsers(params?: {
  page?: number
  size?: number
  status?: string
}): Promise<PageResponse<AdminUser>> {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.size != null) search.set('size', String(params.size))
  if (params?.status) search.set('status', params.status)
  const q = search.toString()
  return api.get<PageResponse<AdminUser>>(`/admin/users${q ? `?${q}` : ''}`)
}

export async function setUserStatus(userId: string, active: boolean): Promise<void> {
  await api.patch(`/admin/users/${userId}/status`, { active })
}
