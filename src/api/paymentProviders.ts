import { api } from "./client";

export type BictorysEnvironment = "test" | "live";

export type BictorysSettingsResponse = {
  configured: boolean;
  enabled: boolean;
  environment: BictorysEnvironment;
  country?: string;
  apiKeyMasked?: string;
  webhookSecretMasked?: string;
  /** Relative to the API base URL. */
  webhookPath?: string;
  updatedAt?: string;
};

export type BictorysSettingsRequest = {
  /** Blank keeps the stored key. */
  apiKey?: string;
  webhookSecret?: string;
  environment: BictorysEnvironment;
  country?: string;
  enabled?: boolean;
};

export type BictorysConnectionTestResponse = {
  ok: boolean;
  message: string;
};

const BICTORYS_PATH = "/settings/payment-providers/bictorys";

export async function getBictorysSettings(): Promise<BictorysSettingsResponse> {
  return api.get<BictorysSettingsResponse>(BICTORYS_PATH);
}

export async function saveBictorysSettings(
  req: BictorysSettingsRequest
): Promise<BictorysSettingsResponse> {
  return api.put<BictorysSettingsResponse>(BICTORYS_PATH, req);
}

export async function testBictorysSettings(): Promise<BictorysConnectionTestResponse> {
  return api.post<BictorysConnectionTestResponse>(`${BICTORYS_PATH}/test`);
}
