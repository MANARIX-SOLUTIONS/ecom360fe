/**
 * Stores API - CRUD for business stores
 */

import { api } from './client'

export type StoreResponse = {
  id: string
  businessId: string
  name: string
  address?: string
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type StoreRequest = {
  name: string
  address?: string
  phone?: string
  isActive?: boolean
}

export async function listStores(): Promise<StoreResponse[]> {
  return api.get<StoreResponse[]>('/stores')
}

export async function getStore(id: string): Promise<StoreResponse> {
  return api.get<StoreResponse>(`/stores/${id}`)
}

export async function createStore(req: StoreRequest): Promise<StoreResponse> {
  return api.post<StoreResponse>('/stores', req)
}

export async function updateStore(id: string, req: Partial<StoreRequest>): Promise<StoreResponse> {
  return api.put<StoreResponse>(`/stores/${id}`, req)
}

export async function deleteStore(id: string): Promise<void> {
  return api.delete(`/stores/${id}`)
}
