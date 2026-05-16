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
import { useMatrixCan } from "@/hooks/useMatrixCan";
import type { PlanResponse, SubscriptionUsageResponse } from "@/api";
import styles from "./Settings.module.css";

function getPlanComparisonRows(): { label: string; key: string }[] {
  return [
    { label: t.settings.planRowUsers, key: "users" },
    { label: t.settings.planRowStores, key: "stores" },
    { label: t.settings.planRowSales, key: "sales" },
    { label: t.settings.planRowProducts, key: "products" },
    { label: t.settings.planRowClients, key: "clients" },
    { label: t.settings.planRowSuppliers, key: "suppliers" },
    { label: t.settings.planRowPos, key: "pos" },
    { label: t.settings.planRowStock, key: "stock" },
    { label: t.settings.planRowReceipts, key: "receipts" },
    { label: t.settings.planRowExpenses, key: "expenses" },
    { label: t.settings.planRowDeliveryCouriers, key: "deliveryCouriers" },
    { label: t.settings.planRowGlobalView, key: "globalView" },
    { label: t.settings.planRowReports, key: "reports" },
    { label: t.settings.planRowAdvancedReports, key: "advancedReports" },
    { label: t.settings.planRowMultiPayment, key: "multiPayment" },
    { label: t.settings.planRowExportPdf, key: "exportPdf" },
    { label: t.settings.planRowExportExcel, key: "exportExcel" },
    { label: t.settings.planRowClientCredits, key: "clientCredits" },
    { label: t.settings.planRowSupplierTracking, key: "supplierTracking" },
    { label: t.settings.planRowRoleManagement, key: "roleManagement" },
    { label: t.settings.planRowApi, key: "api" },
    { label: t.settings.planRowPrioritySupport, key: "prioritySupport" },
    { label: t.settings.planRowAccountManager, key: "accountManager" },
    { label: t.settings.planRowCustomBranding, key: "customBranding" },
    { label: t.settings.planRowStockAlerts, key: "stockAlerts" },
    { label: t.settings.planRowDataRetention, key: "dataRetention" },
  ];
}

function formatFCFA(n: number): string {
  if (n === 0) return t.common.unlimited;
  return new Intl.NumberFormat("fr-FR").format(n) + " F";
}

function formatDataRetention(months: number): string {
  if (months === 0) return t.common.unlimited;
  return t.settings.dataRetentionMonthsTpl.replace("{n}", String(months));
}

function planToDisplay(p: PlanResponse) {
  const unlimited = t.common.unlimited;
  const users = p.maxUsers === 0 ? unlimited : String(p.maxUsers);
  const stores = p.maxStores === 0 ? unlimited : String(p.maxStores);
  const sales =
    p.maxSalesPerMonth === 0 ? unlimited : String(p.maxSalesPerMonth) + t.subscription.perMonth;
  const products = p.maxProducts === 0 ? unlimited : String(p.maxProducts);
  const clients = p.maxClients === 0 ? unlimited : String(p.maxClients);
  const suppliers = p.maxSuppliers === 0 ? unlimited : String(p.maxSuppliers);
  const dataRetention = formatDataRetention(p.dataRetentionMonths ?? 0);
  return {
    key: p.slug,
    name: p.name,
    price: formatFCFA(p.priceMonthly),
    priceYear: formatFCFA(p.priceYearly),
    features: [
      t.settings.planLimitUsersTpl.replace("{n}", users),
      t.settings.planLimitStoresTpl.replace("{n}", stores),
      t.settings.planLimitSalesTpl.replace("{sales}", sales),
      t.settings.planLimitProductsTpl.replace("{n}", products),
      p.featureExpenses && t.settings.planFeatExpenses,
      p.featureDeliveryCouriers && t.settings.planFeatDeliveryCouriers,
      p.featureGlobalView && t.settings.planFeatGlobalView,
      p.featureReports && t.settings.planFeatReports,
      p.featureMultiPayment && t.settings.planFeatMultiPayment,
      p.featureExportPdf && t.settings.planFeatExportPdf,
      p.featureExportExcel && t.settings.planFeatExportExcel,
      p.featureClientCredits && t.settings.planFeatClientCredits,
      p.featureSupplierTracking && t.settings.planFeatSupplierTracking,
      p.featureStockAlerts && t.settings.planFeatStockAlerts,
      t.settings.planHistoryRetentionTpl.replace("{period}", dataRetention),
      p.featureRoleManagement && t.settings.planFeatRoleManagement,
      p.featureApi && t.settings.planFeatApi,
      p.featurePrioritySupport && t.settings.planFeatPrioritySupport,
      p.featureAccountManager && t.settings.planFeatAccountManager,
      p.featureCustomBranding && t.settings.planFeatCustomBranding,
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
  if (limit === 0)
    return t.settings.subscriptionUsageUnlimitedCount.replace("{count}", String(count));
  return `${count} / ${limit}`;
}

export default function SettingsSubscription() {
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();
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

  const comparisonRows = getPlanComparisonRows();

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
      .catch(() => message.error(t.settings.plansLoadError))
      .finally(() => setLoading(false));
  }, []);

  const handleChoose = (plan: ReturnType<typeof planToDisplay>) => {
    if (plan.key === currentPlanSlug) return;
    Modal.confirm({
      title: t.settings.planChangeModalTitle.replace("{plan}", plan.name),
      content: t.settings.planChangeModalContent
        .replace("{amount}", yearlyBilling ? plan.priceYear : plan.price)
        .replace("{period}", yearlyBilling ? t.settings.periodPerYear : t.subscription.perMonth),
      okText: t.common.confirm,
      cancelText: t.common.cancel,
      onOk: () => {
        setChanging(plan.key);
        return changePlan(plan.key, yearlyBilling ? "yearly" : "monthly")
          .then((sub) => {
            message.success(t.settings.planUpdatedToast.replace("{plan}", plan.name));
            setSubscription(sub);
            if (sub?.planSlug) localStorage.setItem("ecom360_plan_slug", sub.planSlug);
            window.dispatchEvent(new Event("ecom360:plan-updated"));
            refreshSubscription();
          })
          .catch((e) => {
            message.error(e instanceof Error ? e.message : t.settings.planChangeError);
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
            {t.settings.subscriptionExpiredBannerTitle}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
            {t.settings.subscriptionExpiredBannerDesc}
          </Typography.Text>
        </Card>
      )}

      <header className={styles.settingsPageHeader}>
        <Typography.Title level={4} className={styles.settingsPageTitle}>
          {t.settings.subscription}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
          {t.settings.subscriptionPageSubtitle}
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
            <Typography.Text strong>{t.settings.subscriptionUsageTitle}</Typography.Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8, fontSize: 13 }}>
              {usage.usersLimit > 0 && (
                <span>
                  {t.settings.subscriptionUsageUsers}{" "}
                  {formatUsage(usage.usersCount, usage.usersLimit)}
                </span>
              )}
              {usage.storesLimit > 0 && (
                <span>
                  {t.settings.subscriptionUsageStores}{" "}
                  {formatUsage(usage.storesCount, usage.storesLimit)}
                </span>
              )}
              {usage.productsLimit > 0 && (
                <span>
                  {t.settings.subscriptionUsageProducts}{" "}
                  {formatUsage(usage.productsCount, usage.productsLimit)}
                </span>
              )}
              {usage.clientsLimit > 0 && (
                <span>
                  {t.settings.subscriptionUsageClients}{" "}
                  {formatUsage(usage.clientsCount, usage.clientsLimit)}
                </span>
              )}
              {usage.suppliersLimit > 0 && (
                <span>
                  {t.settings.subscriptionUsageSuppliers}{" "}
                  {formatUsage(usage.suppliersCount, usage.suppliersLimit)}
                </span>
              )}
              {usage.salesLimit > 0 && (
                <span>
                  {t.settings.subscriptionUsageSalesMonth}{" "}
                  {formatUsage(usage.salesThisMonth, usage.salesLimit)}
                </span>
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
          {t.settings.billingMonthly}
        </button>
        <button
          type="button"
          className={`${styles.billingBtn} ${yearlyBilling ? styles.billingBtnActive : ""}`}
          onClick={() => setYearlyBilling(true)}
        >
          {t.settings.billingAnnual}
          <Tag
            color="success"
            style={{ margin: 0, marginLeft: 6, fontSize: 10, lineHeight: "16px", padding: "0 6px" }}
          >
            {t.settings.billingAnnualDiscountTag}
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
                      {t.settings.planRecommendedTag}
                    </Tag>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span className={styles.planCardPrice}>
                  {yearlyBilling ? plan.priceYear : plan.price}
                </span>
                <span className={styles.planCardPeriod}>
                  {yearlyBilling ? t.settings.periodPerYear : t.subscription.perMonth}
                </span>
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
                      {t.settings.trialFreeTag}
                    </Tag>
                  )}
                  {daysRemaining != null && daysRemaining >= 0 && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t.settings.daysRemainingLabel} {daysRemaining}
                    </Typography.Text>
                  )}
                  {cancelAtPeriodEnd && (
                    <Tag color="orange" style={{ alignSelf: "flex-start" }}>
                      {t.settings.cancelAtPeriodEndTag}
                    </Tag>
                  )}
                </div>
              ) : matrixCan("SUBSCRIPTION_UPDATE", "settings:subscription") ? (
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
                  {t.settings.planReadOnlyBadge}
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
          {t.settings.planComparisonTitle}
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
                  <th>{t.settings.planComparisonFeatureColumn}</th>
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

      {currentPlanSlug &&
        matrixCan("SUBSCRIPTION_UPDATE", "settings:subscription") &&
        !isExpired && (
          <div
            style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--color-border)" }}
          >
            {cancelAtPeriodEnd ? (
              <>
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  {t.settings.subscriptionCancelPendingHint}
                </Typography.Text>
                <Button
                  type="primary"
                  loading={reactivating}
                  onClick={() => {
                    setReactivating(true);
                    reactivateSubscription()
                      .then((sub) => {
                        message.success(t.settings.subscriptionReactivated);
                        setSubscription(sub);
                        refreshSubscription();
                      })
                      .catch((e) => {
                        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
                      })
                      .finally(() => setReactivating(false));
                  }}
                >
                  {t.settings.subscriptionReactivateButton}
                </Button>
              </>
            ) : (
              <>
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  {t.settings.subscriptionCancelIntro}
                </Typography.Text>
                <Button
                  type="text"
                  danger
                  loading={cancelling}
                  onClick={() => {
                    const { destroy } = Modal.confirm({
                      title: t.settings.subscriptionCancelModalTitle,
                      content: (
                        <div style={{ marginTop: 8 }}>
                          <p style={{ marginBottom: 12 }}>
                            <strong>{t.settings.subscriptionCancelEndPeriodTitle}</strong>{" "}
                            {t.settings.subscriptionCancelEndPeriodDesc}
                          </p>
                          <p>
                            <strong>{t.settings.subscriptionCancelImmediateTitle}</strong>{" "}
                            {t.settings.subscriptionCancelImmediateDesc}
                          </p>
                        </div>
                      ),
                      okText: t.settings.subscriptionCancelOkEndPeriod,
                      cancelText: t.settings.subscriptionCancelKeepSubscription,
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
                                message.success(t.settings.subscriptionCancelledNow);
                                destroy();
                                refreshSubscription();
                              } catch (e) {
                                message.error(
                                  e instanceof Error ? e.message : t.common.errorGeneric
                                );
                              } finally {
                                setCancelling(false);
                              }
                            }}
                          >
                            {t.settings.subscriptionCancelImmediateButton}
                          </Button>
                          <OkBtn />
                        </>
                      ),
                      onOk: async () => {
                        setCancelling(true);
                        try {
                          await cancelSubscription(true);
                          message.success(t.settings.subscriptionCancelledEndPeriod);
                          refreshSubscription();
                        } catch (e) {
                          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
                          throw e;
                        } finally {
                          setCancelling(false);
                        }
                      },
                    });
                  }}
                >
                  {t.settings.subscriptionCancelMainButton}
                </Button>
              </>
            )}
          </div>
        )}
    </div>
  );
}
