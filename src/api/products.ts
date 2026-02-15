/**
 * Products API
 */

import { api } from './client'

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ProductResponse = {
  id: string
  businessId: string
  categoryId: string | null
  name: string
  sku: string | null
  barcode: string | null
  description: string | null
  costPrice: number
  salePrice: number
  unit: string
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductRequest = {
  name: string
  sku?: string
  barcode?: string
  description?: string
  costPrice: number
  salePrice: number
  unit?: string
  imageUrl?: string
  categoryId?: string | null
  isActive?: boolean
}

export async function listProducts(params?: {
  page?: number
  size?: number
  search?: string
}): Promise<PageResponse<ProductResponse>> {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.size != null) search.set('size', String(params.size))
  if (params?.search) search.set('search', params.search)
  const qs = search.toString()
  return api.get<PageResponse<ProductResponse>>(`/products${qs ? `?${qs}` : ''}`)
}

export async function getProduct(id: string): Promise<ProductResponse> {
  return api.get<ProductResponse>(`/products/${id}`)
}

export async function createProduct(req: ProductRequest): Promise<ProductResponse> {
  return api.post<ProductResponse>('/products', req)
}

export async function updateProduct(id: string, req: Partial<ProductRequest>): Promise<ProductResponse> {
  return api.put<ProductResponse>(`/products/${id}`, req)
}

export async function deleteProduct(id: string): Promise<void> {
  return api.delete(`/products/${id}`)
}
