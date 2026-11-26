import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  CONVERSION,
  FAILED_JOBS_24H,
  LEADS,
  MONTH_MOVEMENT,
  MRR_HISTORY_OFFSETS,
  OPEN_TICKETS,
  PAYMENTS,
  SEED_AUDIT,
  SEED_FEATURE_OVERRIDES,
  SERVICES,
  STORY_PAYMENT_ID,
  STORY_TENANT_ID,
  TENANTS,
} from "./demo-data";
import {
  canDo,
  daysFromToday,
  daysSince,
  featureById,
  isActiveTenant,
  monthlyAmount,
  PLAN_LABEL,
  planIncludesFeature,
  type ActionId,
  type AuditEvent,
  type FeatureId,
  type FeatureOverride,
  type Payment,
  type RoleId,
  type Tenant,
} from "./model";

const STORAGE_KEY = "ecom360-bo2-state-1";

export type ThemeMode = "dark" | "light";
export type Density = "compact" | "comfort";
export type DataState = "ready" | "loading" | "error";

type Persisted = {
  theme: ThemeMode;
  density: Density;
  role: RoleId;
  includeDemo: boolean;
  paidIds: string[];
  remindedIds: string[];
  revealed: string[];
  extraAudit: AuditEvent[];
  featureOverrides: FeatureOverride[] | null;
  assistance: {
    tenantId: string;
    reason: string;
    minutes: number;
    readOnly: boolean;
    startedAt: string;
  } | null;
};

type ConsoleContextValue = {
  theme: ThemeMode;
  density: Density;
  role: RoleId;
  includeDemo: boolean;
  dataState: DataState;
  tenants: Tenant[];
  payments: Payment[];
  audit: AuditEvent[];
  leads: typeof LEADS;
  services: typeof SERVICES;
  tickets: typeof OPEN_TICKETS;
  movement: typeof MONTH_MOVEMENT;
  conversion: typeof CONVERSION;
  failedJobs: number;
  remindedIds: string[];
  assistance: Persisted["assistance"];
  featureOverrides: FeatureOverride[];
  platform: { level: "ok" | "degraded" | "down"; label: string };
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: Density) => void;
  setRole: (role: RoleId) => void;
  setIncludeDemo: (value: boolean) => void;
  setDataState: (value: DataState) => void;
  can: (action: ActionId) => boolean;
  isRevealed: (key: string) => boolean;
  reveal: (key: string, label: string, tenant: Tenant) => void;
  sendReminder: (payment: Payment, tenant: Tenant) => void;
  confirmPayment: (payment: Payment, tenant: Tenant, note: string) => void;
  startAssistance: (tenant: Tenant, reason: string, minutes: number, readOnly: boolean) => void;
  endAssistance: () => void;
  setFeatureOverride: (
    tenant: Tenant,
    featureId: FeatureId,
    enabled: boolean,
    reason: string
  ) => void;
  clearFeatureOverride: (tenant: Tenant, featureId: FeatureId) => void;
};

const ConsoleContext = createContext<ConsoleContextValue | null>(null);

function loadPersisted(): Persisted {
  const fallback: Persisted = {
    theme: "dark",
    density: "compact",
    role: "super_admin",
    includeDemo: false,
    paidIds: [],
    remindedIds: [],
    revealed: [],
    extraAudit: [],
    featureOverrides: null,
    assistance: null,
  };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function staffActor(role: RoleId): string {
  const suffix =
    role === "finance"
      ? "Finance"
      : role === "support"
        ? "Support"
        : role === "sales"
          ? "Ventes"
          : "Super admin";
  return `Awa Diop · ${suffix}`;
}

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(loadPersisted);
  const [dataState, setDataState] = useState<DataState>("ready");

  const update = useCallback((patch: Partial<Persisted>) => {
    setPersisted((current) => {
      const next = { ...current, ...patch };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const tenants = useMemo(() => {
    return TENANTS.map((tenant) => {
      if (tenant.id === STORY_TENANT_ID && persisted.paidIds.includes(STORY_PAYMENT_ID)) {
        return { ...tenant, status: "actif" as const, renewal: "2026-11-08" };
      }
      return tenant;
    });
  }, [persisted.paidIds]);

  const payments = useMemo(() => {
    return PAYMENTS.map((payment) =>
      persisted.paidIds.includes(payment.id) ? { ...payment, status: "reussi" as const } : payment
    );
  }, [persisted.paidIds]);

  const visibleTenants = useMemo(
    () => tenants.filter((tenant) => persisted.includeDemo || !tenant.isDemo),
    [persisted.includeDemo, tenants]
  );

  const audit = useMemo(
    () => [...persisted.extraAudit, ...SEED_AUDIT].sort((a, b) => (a.at < b.at ? 1 : -1)),
    [persisted.extraAudit]
  );

  const featureOverrides = persisted.featureOverrides ?? SEED_FEATURE_OVERRIDES;

  const pushAudit = useCallback(
    (event: AuditEvent) => {
      update({ extraAudit: [event, ...persisted.extraAudit] });
    },
    [persisted.extraAudit, update]
  );

  const platform = useMemo(() => {
    if (SERVICES.some((service) => service.status === "down")) {
      return { level: "down" as const, label: "Interruption" };
    }
    const degraded = SERVICES.find((service) => service.status === "degraded");
    if (degraded)
      return { level: "degraded" as const, label: `${degraded.name} — ${degraded.detail}` };
    return { level: "ok" as const, label: "Opérationnelle" };
  }, []);

  const value = useMemo<ConsoleContextValue>(
    () => ({
      theme: persisted.theme,
      density: persisted.density,
      role: persisted.role,
      includeDemo: persisted.includeDemo,
      dataState,
      tenants: visibleTenants,
      payments,
      audit,
      leads: LEADS,
      services: SERVICES,
      tickets: OPEN_TICKETS,
      movement: MONTH_MOVEMENT,
      conversion: CONVERSION,
      failedJobs: FAILED_JOBS_24H,
      remindedIds: persisted.remindedIds,
      assistance: persisted.assistance,
      featureOverrides,
      platform,
      setTheme: (theme) => update({ theme }),
      setDensity: (density) => update({ density }),
      setRole: (role) => update({ role }),
      setIncludeDemo: (includeDemo) => update({ includeDemo }),
      setDataState,
      can: (action) => canDo(persisted.role, action),
      isRevealed: (key) => persisted.revealed.includes(key),
      reveal: (key, label, tenant) => {
        if (persisted.revealed.includes(key)) return;
        update({ revealed: [...persisted.revealed, key] });
        pushAudit({
          id: `aud-reveal-${key}`,
          at: new Date().toISOString(),
          actor: staffActor(persisted.role),
          actorType: "staff",
          action: `a révélé ${label} de ${tenant.name}`,
          target: tenant.owner,
          tenantId: tenant.id,
          tenantName: tenant.name,
          ip: "41.82.10.4",
          country: "Sénégal",
          severity: "attention",
          requestId: `req_${key.slice(0, 6)}`,
          userAgent: "Chrome 129 · macOS",
        });
      },
      sendReminder: (payment, tenant) => {
        update({ remindedIds: [...persisted.remindedIds, payment.id] });
        pushAudit({
          id: `aud-remind-${payment.id}`,
          at: new Date().toISOString(),
          actor: staffActor(persisted.role),
          actorType: "staff",
          action: `a envoyé un rappel WhatsApp à ${tenant.owner} pour un paiement ${payment.channel} de ${payment.amount.toLocaleString("fr-FR")} F`,
          target: tenant.name,
          tenantId: tenant.id,
          tenantName: tenant.name,
          ip: "41.82.10.4",
          country: "Sénégal",
          severity: "info",
          requestId: `req_wa_${payment.id.slice(-4)}`,
          userAgent: "Chrome 129 · macOS",
          before: "Rappel : non envoyé",
          after: `Rappel WhatsApp envoyé · ${payment.ref}`,
        });
      },
      confirmPayment: (payment, tenant, note) => {
        update({ paidIds: [...persisted.paidIds, payment.id] });
        pushAudit({
          id: `aud-paid-${payment.id}`,
          at: new Date().toISOString(),
          actor: staffActor(persisted.role),
          actorType: "staff",
          action: `a confirmé le paiement ${payment.channel} de ${payment.amount.toLocaleString("fr-FR")} F pour ${tenant.name}. Abonnement ${PLAN_LABEL[tenant.plan]} réactivé.`,
          target: `Facture ${payment.invoice}`,
          tenantId: tenant.id,
          tenantName: tenant.name,
          ip: "41.82.10.4",
          country: "Sénégal",
          severity: "critique",
          requestId: `req_pay_${payment.id.slice(-4)}`,
          userAgent: "Chrome 129 · macOS",
          before: "Paiement : échoué · abonnement impayé",
          after: `Paiement : réussi · abonnement actif · ${note}`,
        });
      },
      startAssistance: (tenant, reason, minutes, readOnly) => {
        update({
          assistance: {
            tenantId: tenant.id,
            reason,
            minutes,
            readOnly,
            startedAt: new Date().toISOString(),
          },
        });
        pushAudit({
          id: `aud-assist-${tenant.id}`,
          at: new Date().toISOString(),
          actor: staffActor(persisted.role),
          actorType: "staff",
          action: `a ouvert une session d'assistance sur ${tenant.name} (${readOnly ? "lecture seule" : "accès complet"}, ${minutes} min)`,
          target: tenant.name,
          tenantId: tenant.id,
          tenantName: tenant.name,
          ip: "41.82.10.4",
          country: "Sénégal",
          severity: "critique",
          requestId: `req_as_${tenant.id.slice(0, 4)}`,
          userAgent: "Chrome 129 · macOS",
          before: "Aucune session",
          after: reason,
        });
      },
      endAssistance: () => update({ assistance: null }),
      setFeatureOverride: (tenant, featureId, enabled, reason) => {
        const feature = featureById(featureId);
        const included = planIncludesFeature(tenant.plan, featureId);
        const next = [
          ...featureOverrides.filter(
            (item) => !(item.tenantId === tenant.id && item.featureId === featureId)
          ),
          { tenantId: tenant.id, featureId, enabled, reason },
        ];
        const verb = enabled ? "a accordé" : "a retiré";
        update({
          featureOverrides: next,
          extraAudit: [
            {
              id: `aud-feat-${tenant.id}-${featureId}-${Date.now()}`,
              at: new Date().toISOString(),
              actor: staffActor(persisted.role),
              actorType: "staff",
              action: `${verb} « ${feature.label} » pour ${tenant.name}`,
              target: feature.label,
              tenantId: tenant.id,
              tenantName: tenant.name,
              ip: "41.82.10.4",
              country: "Sénégal",
              severity: "attention",
              requestId: `req_ft_${featureId.slice(0, 6)}`,
              userAgent: "Chrome 129 · macOS",
              before: included
                ? `Plan ${PLAN_LABEL[tenant.plan]} : inclus`
                : `Plan ${PLAN_LABEL[tenant.plan]} : non inclus`,
              after: `${enabled ? "Activé" : "Désactivé"} · ${reason}`,
            },
            ...persisted.extraAudit,
          ],
        });
      },
      clearFeatureOverride: (tenant, featureId) => {
        const feature = featureById(featureId);
        const current = featureOverrides.find(
          (item) => item.tenantId === tenant.id && item.featureId === featureId
        );
        if (!current) return;
        update({
          featureOverrides: featureOverrides.filter(
            (item) => !(item.tenantId === tenant.id && item.featureId === featureId)
          ),
          extraAudit: [
            {
              id: `aud-feat-clear-${tenant.id}-${featureId}-${Date.now()}`,
              at: new Date().toISOString(),
              actor: staffActor(persisted.role),
              actorType: "staff",
              action: `a remis « ${feature.label} » de ${tenant.name} sur le plan ${PLAN_LABEL[tenant.plan]}`,
              target: feature.label,
              tenantId: tenant.id,
              tenantName: tenant.name,
              ip: "41.82.10.4",
              country: "Sénégal",
              severity: "attention",
              requestId: `req_fc_${featureId.slice(0, 6)}`,
              userAgent: "Chrome 129 · macOS",
              before: `${current.enabled ? "Activé" : "Désactivé"} · ${current.reason}`,
              after: `Suit le plan ${PLAN_LABEL[tenant.plan]}`,
            },
            ...persisted.extraAudit,
          ],
        });
      },
    }),
    [
      audit,
      dataState,
      featureOverrides,
      payments,
      persisted,
      platform,
      pushAudit,
      update,
      visibleTenants,
    ]
  );

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole(): ConsoleContextValue {
  const value = useContext(ConsoleContext);
  if (!value) throw new Error("useConsole must be used inside ConsoleProvider");
  return value;
}

export function useMetrics(tenants: Tenant[]) {
  return useMemo(() => {
    const mrr = tenants.reduce((sum, tenant) => sum + monthlyAmount(tenant), 0);
    const gmv = tenants.reduce((sum, tenant) => sum + tenant.gmv30, 0);
    const active = tenants.filter(isActiveTenant).length;
    const trials = tenants.filter((tenant) => tenant.status === "essai").length;
    const plans = (["business", "pro", "starter"] as const).map((plan) => ({
      plan,
      count: tenants.filter((tenant) => tenant.plan === plan).length,
    }));
    const renewalsSoon = tenants.filter((tenant) => {
      if (tenant.status !== "actif" && tenant.status !== "impaye") return false;
      const days = daysFromToday(tenant.renewal);
      return days >= 0 && days <= 30;
    });
    const inactive = tenants.filter(
      (tenant) => tenant.status === "actif" && daysSince(tenant.lastActivity) >= 14
    );
    const history = MRR_HISTORY_OFFSETS.map((offset) => mrr - offset);
    return {
      mrr,
      gmv,
      active,
      total: tenants.length,
      trials,
      plans,
      renewalsSoon,
      inactive,
      history,
    };
  }, [tenants]);
}
