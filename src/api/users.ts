/**
 * User profile and business users API
 */

import { api } from './client'

export type UserProfile = {
  id: string
  fullName: string
  email: string
  phone?: string
}

export type BusinessUser = {
  id: string
  userId: string
  fullName: string
  email: string
  role: string
  isActive: boolean
}

export async function getUserProfile(): Promise<UserProfile> {
  return api.get<UserProfile>('/users/me')
}

export async function updateUserProfile(data: {
  fullName: string
  email: string
  phone?: string
}): Promise<UserProfile> {
  return api.put<UserProfile>('/users/me', data)
}

export async function listBusinessUsers(): Promise<BusinessUser[]> {
  return api.get<BusinessUser[]>('/business/users')
}

export async function inviteBusinessUser(data: { email: string; role: string }): Promise<BusinessUser> {
  return api.post<BusinessUser>('/business/users', data)
}
