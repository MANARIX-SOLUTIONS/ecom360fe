export type PlatformTone = "ok" | "warn" | "danger" | "unknown";

export type PlatformStatusKey = "operational" | "degraded" | "down" | "unknown";

export function platformStatusFromOverall(overall: string | null | undefined): {
  tone: PlatformTone;
  key: PlatformStatusKey;
} {
  if (overall === "healthy") return { tone: "ok", key: "operational" };
  if (overall === "degraded") return { tone: "warn", key: "degraded" };
  if (overall === "down") return { tone: "danger", key: "down" };
  return { tone: "unknown", key: "unknown" };
}

export type BackofficeEnvironment = "production" | "staging" | "development";

export function backofficeEnvironment(
  appEnv: string | undefined = import.meta.env.VITE_APP_ENV,
  prod = import.meta.env.PROD
): BackofficeEnvironment {
  if (appEnv === "production" || appEnv === "staging" || appEnv === "development") return appEnv;
  return prod ? "production" : "development";
}
