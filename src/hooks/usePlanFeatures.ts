import { useSyncExternalStore, useEffect } from "react";
import { getSubscription, listPlans } from "@/api";
import type { PlanResponse } from "@/api";
import { createSharedStore } from "@/hooks/createSharedStore";

/**
 * Plan-based feature gating.
 * Fetches plan features from backend when authenticated; falls back to pro (trial) when not.
 */

type FeatureFlags = {
  expenses: boolean;
  reports: boolean;
  suppliers: boolean;
  livreurs: boolean;
  globalView: boolean;
  multiPayment: boolean;
  clientCredits: boolean;
  settingsUsers: boolean;
  advancedReports: boolean;
  api: boolean;
  stockAlerts: boolean;
  exportPdf: boolean;
  exportExcel: boolean;
  customBranding: boolean;
};

const DEFAULT_FEATURES: FeatureFlags = {
  expenses: true,
  reports: true,
  suppliers: true,
  livreurs: true,
  globalView: false,
  multiPayment: true,
  clientCredits: true,
  settingsUsers: true,
  advancedReports: false,
  api: false,
  stockAlerts: true,
  exportPdf: true,
  exportExcel: true,
  customBranding: false,
};

function planToFeatures(p: PlanResponse): FeatureFlags {
  return {
    expenses: p.featureExpenses,
    reports: p.featureReports,
    suppliers: p.featureSupplierTracking,
    livreurs: p.featureDeliveryCouriers ?? false,
    globalView: p.featureGlobalView ?? false,
    multiPayment: p.featureMultiPayment,
    clientCredits: p.featureClientCredits,
    settingsUsers: p.featureRoleManagement,
    advancedReports: p.featureAdvancedReports,
    api: p.featureApi,
    stockAlerts: p.featureStockAlerts ?? true,
    exportPdf: p.featureExportPdf,
    exportExcel: p.featureExportExcel,
    customBranding: p.featureCustomBranding ?? false,
  };
}

type PlanState = {
  planSlug: string | null;
  features: FeatureFlags;
};

const planStore = createSharedStore<PlanState>({
  planSlug: typeof window !== "undefined" ? localStorage.getItem("ecom360_plan_slug") : null,
  features: DEFAULT_FEATURES,
});

/** Chargé une fois par session ; l'évènement plan-updated force un refetch. */
let planLoaded = false;

async function fetchPlanFeatures(force = false): Promise<void> {
  if (!localStorage.getItem("ecom360_access_token")) {
    planLoaded = false;
    planStore.setState((s) => ({ ...s, features: DEFAULT_FEATURES }));
    return;
  }
  if (!force && planLoaded) return;
  return planStore.run(async () => {
    try {
      const [sub, plans] = await Promise.all([getSubscription(), listPlans()]);
      const slug = sub?.planSlug ?? localStorage.getItem("ecom360_plan_slug");
      const plan = plans.find((p) => p.slug.toLowerCase() === (slug ?? "").toLowerCase());
      planLoaded = true;
      planStore.setState({
        planSlug: slug ?? null,
        features: plan ? planToFeatures(plan) : DEFAULT_FEATURES,
      });
    } catch {
      planStore.setState((s) => ({ ...s, features: DEFAULT_FEATURES }));
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("ecom360:plan-updated", () => {
    void fetchPlanFeatures(true);
  });
  window.addEventListener("ecom360:auth-set", () => {
    void fetchPlanFeatures(true);
  });
  window.addEventListener("ecom360:auth-expired", () => {
    void fetchPlanFeatures();
  });
}

export function usePlanFeatures() {
  const { planSlug, features } = useSyncExternalStore(
    planStore.subscribe,
    planStore.getSnapshot,
    planStore.getSnapshot
  );

  useEffect(() => {
    void fetchPlanFeatures();
  }, []);

  return {
    planSlug,
    canExpenses: features.expenses,
    canReports: features.reports,
    canSuppliers: features.suppliers,
    canLivreurs: features.livreurs,
    canGlobalView: features.globalView,
    canMultiPayment: features.multiPayment,
    canClientCredits: features.clientCredits,
    canSettingsUsers: features.settingsUsers,
    canAdvancedReports: features.advancedReports,
    canApi: features.api,
    canStockAlerts: features.stockAlerts,
    canExportPdf: features.exportPdf,
    canExportExcel: features.exportExcel,
    canCustomBranding: features.customBranding,
    /** Combined: can access this permission (role + plan) */
    canAccess: (permission: string, roleCan: boolean) => {
      if (!roleCan) return false;
      if (permission === "expenses") return features.expenses;
      if (permission === "reports") return features.reports;
      if (permission === "suppliers") return features.suppliers;
      /** Menu : la présence d’une permission livreurs suffit ; le plan est encore vérifié par l’API. */
      if (permission === "livreurs") return true;
      if (permission === "globalView") return features.globalView;
      if (permission === "settings:users" || permission === "settings:roles")
        return features.settingsUsers;
      return true;
    },
  };
}
