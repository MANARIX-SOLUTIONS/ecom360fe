/**
 * Clients API
 */

import { api } from './client'
import type { PageResponse } from './products'

export type ClientResponse = {
  id: string
  businessId: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  creditBalance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ClientRequest = {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive?: boolean
}

export type ClientPaymentRequest = {
  storeId: string
  amount: number
  paymentMethod: string
  note?: string
}

export type ClientPaymentResponse = {
  id: string
  clientId: string
  storeId: string
  userId: string
  amount: number
  paymentMethod: string
  note: string | null
  createdAt: string
}

export async function listClients(params?: { page?: number; size?: number }): Promise<PageResponse<ClientResponse>> {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.size != null) search.set('size', String(params.size))
  const qs = search.toString()
  return api.get<PageResponse<ClientResponse>>(`/clients${qs ? `?${qs}` : ''}`)
}

export async function getClient(id: string): Promise<ClientResponse> {
  return api.get<ClientResponse>(`/clients/${id}`)
}

export async function createClient(req: ClientRequest): Promise<ClientResponse> {
  return api.post<ClientResponse>('/clients', req)
}

export async function updateClient(id: string, req: Partial<ClientRequest>): Promise<ClientResponse> {
  return api.put<ClientResponse>(`/clients/${id}`, req)
}

export async function deleteClient(id: string): Promise<void> {
  return api.delete(`/clients/${id}`)
}

export async function recordClientPayment(
  clientId: string,
  req: ClientPaymentRequest
): Promise<ClientPaymentResponse> {
  return api.post<ClientPaymentResponse>(`/clients/${clientId}/payments`, req)
}

export async function listClientPayments(
  clientId: string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<ClientPaymentResponse>> {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.size != null) search.set('size', String(params.size))
  const qs = search.toString()
  return api.get<PageResponse<ClientPaymentResponse>>(
    `/clients/${clientId}/payments${qs ? `?${qs}` : ''}`
  )
}
