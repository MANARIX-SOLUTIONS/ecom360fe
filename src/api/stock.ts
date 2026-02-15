/**
 * Stock / Inventory API
 */

import { api } from './client'

export type StockLevelResponse = {
  id: string
  productId: string
  productName: string
  storeId: string
  storeName: string
  quantity: number
  minStock: number
  lowStock: boolean
  updatedAt: string
}

export type StockInitRequest = {
  productId: string
  storeId: string
  quantity: number
  minStock?: number
}

export type StockAdjustmentRequest = {
  productId: string
  storeId: string
  quantity: number
  type: 'in' | 'out' | 'adjustment'
  reference?: string
  note?: string
}

export async function getStockByStore(storeId: string): Promise<StockLevelResponse[]> {
  return api.get<StockLevelResponse[]>(`/stock/store/${storeId}`)
}

export async function getStockLevel(productId: string, storeId: string): Promise<StockLevelResponse> {
  return api.get<StockLevelResponse>(`/stock/product/${productId}/store/${storeId}`)
}

export async function initStock(req: StockInitRequest): Promise<StockLevelResponse> {
  return api.post<StockLevelResponse>('/stock/init', req)
}

export async function adjustStock(req: StockAdjustmentRequest): Promise<unknown> {
  return api.post('/stock/adjust', req)
}

export type StockMovementResponse = {
  id: string
  productId: string
  storeId: string
  userId: string
  type: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  reference: string | null
  note: string | null
  createdAt: string
}

export async function getStockMovements(
  productId: string,
  storeId: string,
  params?: { page?: number; size?: number }
): Promise<{ content: StockMovementResponse[]; totalElements: number }> {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.size != null) search.set('size', String(params.size))
  const qs = search.toString()
  return api.get<{ content: StockMovementResponse[]; totalElements: number }>(
    `/stock/movements/product/${productId}/store/${storeId}${qs ? `?${qs}` : ''}`
  )
}
