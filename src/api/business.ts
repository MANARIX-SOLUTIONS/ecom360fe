/**
 * Business profile API
 */

import { api } from "./client";

export type BusinessProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
};

export async function getBusinessProfile(): Promise<BusinessProfile> {
  return api.get<BusinessProfile>("/business/me");
}

export async function updateBusinessProfile(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}): Promise<BusinessProfile> {
  return api.put<BusinessProfile>("/business/me", data);
}
