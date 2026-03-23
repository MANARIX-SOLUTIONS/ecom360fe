import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Typography, Tag, message, Modal, Spin } from "antd";
import { ArrowLeft, Star, Check, X as XIcon, Zap } from "lucide-react";
import { t } from "@/i18n";
import {
  getSubscription,
  listPlans,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionUsage,
} from "@/api";
import type { SubscriptionResponse } from "@/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { PlanResponse, SubscriptionUsageResponse } from "@/api";
import styles from "./Settings.module.css";

const comparisonRows: { label: string; key: string }[] = [
  { label: "Utilisateurs", key: "users" },
  { label: "Boutiques", key: "stores" },
  { label: "Ventes", key: "sales" },
  { label: "Produits", key: "products" },
  { label: "Clients", key: "clients" },
  { label: "Fournisseurs", key: "suppliers" },
  { label: "Point de vente (POS)", key: "pos" },
  { label: "Gestion de stock", key: "stock" },
  { label: "Reçus de vente", key: "receipts" },
  { label: "Suivi des dépenses", key: "expenses" },
  { label: "Gestion des livreurs (livraison)", key: "deliveryCouriers" },
  { label: "Vue globale (toutes les boutiques)", key: "globalView" },
  { label: "Rapports de base", key: "reports" },
  { label: "Rapports avancés", key: "advancedReports" },
  { label: "Paiement multi-méthodes", key: "multiPayment" },
  { label: "Export PDF", key: "exportPdf" },
  { label: "Export Excel", key: "exportExcel" },
  { label: "Crédits clients", key: "clientCredits" },
  { label: "Suivi fournisseurs", key: "supplierTracking" },
  { label: "Gestion des rôles", key: "roleManagement" },
  { label: "API & intégrations", key: "api" },
  { label: "Support prioritaire", key: "prioritySupport" },
  { label: "Account manager dédié", key: "accountManager" },
  { label: "Personnalisation (logo)", key: "customBranding" },
  { label: "Alertes stock bas", key: "stockAlerts" },
  { label: "Historique des données", key: "dataRetention" },
];

function formatFCFA(n: number): string {
  if (n === 0) return "Illimité";
  return new Intl.NumberFormat("fr-FR").format(n) + " F";
}

function formatDataRetention(months: number): string {
  if (months === 0) return "Illimité";
  return `${months} mois`;
}

function planToDisplay(p: PlanResponse) {
  const users = p.maxUsers === 0 ? "Illimité" : String(p.maxUsers);
  const stores = p.maxStores === 0 ? "Illimité" : String(p.maxStores);
  const sales = p.maxSalesPerMonth === 0 ? "Illimité" : p.maxSalesPerMonth + "/mois";
  const products = p.maxProducts === 0 ? "Illimité" : String(p.maxProducts);
  const clients = p.maxClients === 0 ? "Illimité" : String(p.maxClients);
  const suppliers = p.maxSuppliers === 0 ? "Illimité" : String(p.maxSuppliers);
  const dataRetention = formatDataRetention(p.dataRetentionMonths ?? 0);
  return {
    key: p.slug,
    name: p.name,
    price: formatFCFA(p.priceMonthly),
    priceYear: formatFCFA(p.priceYearly),
    features: [
      `${users} utilisateur(s)`,
      `${stores} boutique(s)`,
      `Ventes: ${sales}`,
      `Produits: ${products}`,
      p.featureExpenses && "Suivi des dépenses",
      p.featureDeliveryCouriers && "Gestion des livreurs (livraison)",
      p.featureGlobalView && "Vue globale (toutes les boutiques)",
      p.featureReports && "Rapports & analytics",
      p.featureMultiPayment && "Paiement multi-méthodes",
      p.featureExportPdf && "Export PDF",
      p.featureExportExcel && "Export Excel",
      p.featureClientCredits && "Crédits clients",
      p.featureSupplierTracking && "Suivi fournisseurs",
      p.featureStockAlerts && "Alertes stock bas",
      `Historique : ${dataRetention}`,
      p.featureRoleManagement && "Gestion des rôles",
      p.featureApi && "API & intégrations",
      p.featurePrioritySupport && "Support prioritaire",
      p.featureAccountManager && "Account manager dédié",
      p.featureCustomBranding && "Personnalisation (logo)",
    ].filter(Boolean) as string[],
    limits: {
      users,
      stores,
      sales,
      products,
      clients,
      suppliers,
      pos: true,
      stock: true,
      receipts: true,
      expenses: p.featureExpenses,
      deliveryCouriers: p.featureDeliveryCouriers,
      globalView: p.featureGlobalView,
      reports: p.featureReports,
      advancedReports: p.featureAdvancedReports,
      multiPayment: p.featureMultiPayment,
      exportPdf: p.featureExportPdf,
      exportExcel: p.featureExportExcel,
      clientCredits: p.featureClientCredits,
      supplierTracking: p.featureSupplierTracking,
      roleManagement: p.featureRoleManagement,
      api: p.featureApi,
      prioritySupport: p.featurePrioritySupport,
      accountManager: p.featureAccountManager,
      customBranding: p.featureCustomBranding,
      stockAlerts: p.featureStockAlerts,
      dataRetention,
    },
    recommended: p.slug === "pro",
  };
}

function formatUsage(count: number, limit: number): string {
  if (limit === 0) return `${count} (illimité)`;
  return `${count} / ${limit}`;
}

export default function SettingsSubscription() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null | undefined>(
    undefined
  );
  const [usage, setUsage] = useState<SubscriptionUsageResponse | null>(null);
  const [yearlyBilling, setYearlyBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const currentPlanSlug = subscription?.planSlug ?? null;
  const isExpired =
    !subscription || subscription.status === "expired" || subscription.status === "cancelled";
  const isTrialing = subscription?.isTrialing === true;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd === true;
  const daysRemaining = subscription?.daysRemaining;

  const refreshSubscription = () => {
    getSubscription().then(setSubscription);
    getSubscriptionUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  };

  useEffect(() => {
    Promise.all([listPlans(), getSubscription(), getSubscriptionUsage()])
      .then(([plansRes, sub, usageRes]) => {
        setPlans(plansRes);
        setSubscription(sub ?? null);
        setUsage(usageRes);
      })
      .catch(() => message.error("Impossible de charger les plans"))
      .finally(() => setLoading(false));
  }, []);

  const handleChoose = (plan: ReturnType<typeof planToDisplay>) => {
    if (plan.key === currentPlanSlug) return;
    Modal.confirm({
      title: `Passer au plan ${plan.name} ?`,
      content: `Vous serez facturé ${yearlyBilling ? plan.priceYear + "/an" : plan.price + "/mois"}. Le changement est immédiat.`,
      okText: "Confirmer",
      cancelText: "Annuler",
      onOk: () => {
        setChanging(plan.key);
        return changePlan(plan.key, yearlyBilling ? "yearly" : "monthly")
          .then((sub) => {
            message.success(`Plan mis à jour vers ${plan.name} !`);
            setSubscription(sub);
            if (sub?.planSlug) localStorage.setItem("ecom360_plan_slug", sub.planSlug);
            window.dispatchEvent(new Event("ecom360:plan-updated"));
            refreshSubscription();
          })
          .catch((e) => {
            message.error(e instanceof Error ? e.message : "Erreur lors du changement de plan");
            return Promise.reject(e);
          })
          .finally(() => setChanging(null));
      },
    });
  };

  if (loading) {
    return (
      <div className={`${styles.settingsPage} pageWrapper`}>
        <Spin size="large" style={{ display: "block", margin: "48px auto" }} />
      </div>
    );
  }

  const displayPlans = plans.map(planToDisplay);

  return (
    <div className={`${styles.settingsPage} pageWrapper`} style={{ maxWidth: 900 }}>
      <button type="button" className={styles.settingsBack} onClick={() => navigate("/settings")}>
        <ArrowLeft size={18} />
        {t.common.back}
      </button>

      {/* Expired / no subscription banner */}
      {isExpired && (
        <Card
          size="small"
          style={{
            marginBottom: 24,
            borderColor: "var(--color-warning)",
            backgroundColor: "rgba(250, 173, 20, 0.08)",
          }}
        >
          <Typography.Text strong style={{ color: "var(--color-warning)" }}>
            Votre période d&apos;essai est terminée
          </Typography.Text>
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
            Souscrivez à un plan pour continuer à utiliser Ecom360.
          </Typography.Text>
        </Card>
      )}

      <header className={styles.settingsPageHeader}>
        <Typography.Title level={4} className={styles.settingsPageTitle}>
          {t.settings.subscription}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
          Choisissez le plan qui correspond à votre activité
        </Typography.Text>
      </header>

      {/* Usage summary */}
      {usage &&
        (usage.usersLimit > 0 ||
          usage.storesLimit > 0 ||
          usage.productsLimit > 0 ||
          usage.clientsLimit > 0 ||
          usage.suppliersLimit > 0 ||
          usage.salesLimit > 0) && (
          <Card size="small" style={{ marginBottom: 24 }}>
            <Typography.Text strong>Votre utilisation</Typography.Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8, fontSize: 13 }}>
              {usage.usersLimit > 0 && (
                <span>Utilisateurs : {formatUsage(usage.usersCount, usage.usersLimit)}</span>
              )}
              {usage.storesLimit > 0 && (
                <span>Boutiques : {formatUsage(usage.storesCount, usage.storesLimit)}</span>
              )}
              {usage.productsLimit > 0 && (
                <span>Produits : {formatUsage(usage.productsCount, usage.productsLimit)}</span>
              )}
              {usage.clientsLimit > 0 && (
                <span>Clients : {formatUsage(usage.clientsCount, usage.clientsLimit)}</span>
              )}
              {usage.suppliersLimit > 0 && (
                <span>
                  Fournisseurs : {formatUsage(usage.suppliersCount, usage.suppliersLimit)}
                </span>
              )}
              {usage.salesLimit > 0 && (
                <span>Ventes ce mois : {formatUsage(usage.salesThisMonth, usage.salesLimit)}</span>
              )}
            </div>
          </Card>
        )}

      {/* Billing toggle */}
      <div className={styles.billingToggle}>
        <button
          type="button"
          className={`${styles.billingBtn} ${!yearlyBilling ? styles.billingBtnActive : ""}`}
          onClick={() => setYearlyBilling(false)}
        >
          Mensuel
        </button>
        <button
          type="button"
          className={`${styles.billingBtn} ${yearlyBilling ? styles.billingBtnActive : ""}`}
          onClick={() => setYearlyBilling(true)}
        >
          Annuel
          <Tag
            color="success"
            style={{ margin: 0, marginLeft: 6, fontSize: 10, lineHeight: "16px", padding: "0 6px" }}
          >
            -17%
          </Tag>
        </button>
      </div>

      {/* Plan cards */}
      <div
        className={styles.planGrid}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 16,
        }}
      >
        {displayPlans.map((plan) => {
          const isCurrent = plan.key === currentPlanSlug;
          return (
            <Card
              key={plan.key}
              variant="borderless"
              className={`${styles.planCard} ${isCurrent ? styles.planCardCurrent : ""} ${plan.recommended ? styles.planCardRecommended : ""}`}
            >
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 className={styles.planCardName}>{plan.name}</h3>
                  {plan.recommended && (
                    <Tag
                      color="gold"
                      style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <Star size={12} />
                      Recommandé
                    </Tag>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span className={styles.planCardPrice}>
                  {yearlyBilling ? plan.priceYear : plan.price}
                </span>
                <span className={styles.planCardPeriod}>{yearlyBilling ? "/an" : "/mois"}</span>
              </div>
              {isCurrent ? (
                <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span
                    className={styles.planCardBadge}
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <Zap size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                    {t.settings.currentPlan}
                  </span>
                  {isTrialing && (
                    <Tag color="blue" style={{ alignSelf: "flex-start" }}>
                      Essai gratuit
                    </Tag>
                  )}
                  {daysRemaining != null && daysRemaining >= 0 && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Jours restants : {daysRemaining}
                    </Typography.Text>
                  )}
                  {cancelAtPeriodEnd && (
                    <Tag color="orange" style={{ alignSelf: "flex-start" }}>
                      Annulé à la fin de la période
                    </Tag>
                  )}
                </div>
              ) : can("SUBSCRIPTION_UPDATE") ? (
                <Button
                  type={plan.recommended ? "primary" : "default"}
                  block
                  style={{ marginBottom: 16, height: 44 }}
                  onClick={() => handleChoose(plan)}
                  loading={changing === plan.key}
                >
                  {t.settings.choosePlan}
                </Button>
              ) : (
                <span
                  className={styles.planCardBadge}
                  style={{ display: "inline-block", marginBottom: 16 }}
                >
                  Lecture seule
                </span>
              )}
              <ul className={styles.planFeatures}>
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={14} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div style={{ marginTop: 40 }}>
        <Typography.Title level={5} style={{ marginBottom: 16 }}>
          Comparaison détaillée des plans
        </Typography.Title>
        <Card
          variant="borderless"
          className={styles.settingsCard}
          style={{ padding: "0 !important", overflow: "auto" }}
        >
          <div className={styles.comparisonTable}>
            <table>
              <thead>
                <tr>
                  <th>Fonctionnalité</th>
                  {displayPlans.map((p) => (
                    <th
                      key={p.key}
                      className={p.key === currentPlanSlug ? styles.compColActive : ""}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ label, key }) => (
                  <tr key={key}>
                    <td>{label}</td>
                    {displayPlans.map((p) => {
                      const val = (p.limits as Record<string, string | boolean>)[key];
                      return (
                        <td
                          key={p.key}
                          className={p.key === currentPlanSlug ? styles.compColActive : ""}
                        >
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check size={16} style={{ color: "var(--color-success)" }} />
                            ) : (
                              <XIcon
                                size={16}
                                style={{ color: "var(--color-text-muted)", opacity: 0.3 }}
                              />
                            )
                          ) : (
                            <span style={{ fontWeight: 500 }}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {currentPlanSlug && can("SUBSCRIPTION_UPDATE") && !isExpired && (
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--color-border)" }}>
          {cancelAtPeriodEnd ? (
            <>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                Votre abonnement est annulé et prendra fin à la fin de la période en cours.
              </Typography.Text>
              <Button
                type="primary"
                loading={reactivating}
                onClick={() => {
                  setReactivating(true);
                  reactivateSubscription()
                    .then((sub) => {
                      message.success("Abonnement réactivé");
                      setSubscription(sub);
                      refreshSubscription();
                    })
                    .catch((e) => {
                      message.error(e instanceof Error ? e.message : "Erreur");
                    })
                    .finally(() => setReactivating(false));
                }}
              >
                Réactiver l&apos;abonnement
              </Button>
            </>
          ) : (
            <>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                Annuler votre abonnement ? Choisissez de conserver l&apos;accès jusqu&apos;à la fin
                de la période ou d&apos;arrêter immédiatement.
              </Typography.Text>
              <Button
                type="text"
                danger
                loading={cancelling}
                onClick={() => {
                  const { destroy } = Modal.confirm({
                    title: "Annuler l'abonnement ?",
                    content: (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ marginBottom: 12 }}>
                          <strong>À la fin de la période :</strong> Vous conserverez l&apos;accès
                          jusqu&apos;à la fin de la période payée.
                        </p>
                        <p>
                          <strong>Immédiatement :</strong> L&apos;accès sera coupé tout de suite.
                        </p>
                      </div>
                    ),
                    okText: "À la fin de la période",
                    cancelText: "Garder mon abonnement",
                    footer: (_, { OkBtn, CancelBtn }) => (
                      <>
                        <CancelBtn />
                        <Button
                          danger
                          loading={cancelling}
                          onClick={async () => {
                            setCancelling(true);
                            try {
                              await cancelSubscription(false);
                              message.success("Abonnement annulé immédiatement");
                              destroy();
                              refreshSubscription();
                            } catch (e) {
                              message.error(e instanceof Error ? e.message : "Erreur");
                            } finally {
                              setCancelling(false);
                            }
                          }}
                        >
                          Immédiatement
                        </Button>
                        <OkBtn />
                      </>
                    ),
                    onOk: async () => {
                      setCancelling(true);
                      try {
                        await cancelSubscription(true);
                        message.success("Abonnement annulé à la fin de la période");
                        refreshSubscription();
                      } catch (e) {
                        message.error(e instanceof Error ? e.message : "Erreur");
                        throw e;
                      } finally {
                        setCancelling(false);
                      }
                    },
                  });
                }}
              >
                Annuler l&apos;abonnement
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
