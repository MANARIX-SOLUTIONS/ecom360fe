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
  logoUrl?: string | null;
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

export async function updateBusinessLogo(logoUrl: string): Promise<BusinessProfile> {
  return api.patch<BusinessProfile>("/business/me/logo", { logoUrl });
}

/** Téléverse un fichier image ; le backend enregistre le fichier et renvoie le profil avec `logoUrl` relatif `/api/v1/public/...`. */
export async function uploadBusinessLogoFile(file: File): Promise<BusinessProfile> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post<BusinessProfile>("/business/me/logo/upload", formData);
}
