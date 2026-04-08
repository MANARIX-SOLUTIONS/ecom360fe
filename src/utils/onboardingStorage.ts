const STORAGE_KEY = "ecom360_onboarding_v1";

type State = Record<string, "done" | "skipped">;

function read(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null || Array.isArray(o)) return {};
    return o as State;
  } catch {
    return {};
  }
}

function write(state: State): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getOnboardingStatus(businessId: string): "done" | "skipped" | null {
  if (!businessId) return null;
  const v = read()[businessId];
  return v === "done" || v === "skipped" ? v : null;
}

export function setOnboardingStatus(businessId: string, status: "done" | "skipped"): void {
  if (!businessId) return;
  const state = read();
  state[businessId] = status;
  write(state);
}

/** Fenêtre « nouvelle entreprise » alignée sur l’essai (14 jours). */
export const ONBOARDING_NEW_BUSINESS_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function isWithinOnboardingWindow(createdAtIso: string): boolean {
  const t = Date.parse(createdAtIso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ONBOARDING_NEW_BUSINESS_MAX_AGE_MS;
}
