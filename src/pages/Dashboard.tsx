import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Skeleton,
  Button,
  message,
  notification,
  Alert,
  Collapse,
  Tooltip,
  Space,
} from "antd";
import dayjs from "dayjs";
import type { LucideIcon } from "lucide-react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  Receipt,
  PiggyBank,
  Package,
  CreditCard,
  ShoppingCart,
  Plus,
  FileText,
  Users,
  Store,
  ShoppingBag,
  Percent,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/hooks/useStore";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePermissions } from "@/hooks/usePermissions";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { SetupChecklist } from "@/components/SetupChecklist";
import { EmptyState } from "@/components/EmptyState";
import { NoStoreBanner } from "@/components/NoStoreBanner";
import { getDashboard, getDashboardLowStockSlice, getDashboardTopProductsSlice } from "@/api";
import { t } from "@/i18n";
import { formatRangeSummaryFr } from "@/utils/dateLocal";
import { pctChangeVsPrevious } from "@/utils/kpiDelta";
import styles from "./Dashboard.module.css";

function getDashboardPeriodBounds() {
  return {
    periodStart: dayjs().startOf("month").format("YYYY-MM-DD"),
    periodEnd: dayjs().format("YYYY-MM-DD"),
  };
}

const DASH_LIST_BATCH = 10;

const PAYMENT_COLORS: Record<string, string> = {
  cash: "var(--color-primary)",
  wave: "var(--color-success)",
  orange_money: "var(--color-warning)",
  credit: "var(--color-danger)",
};

type DashboardStatCard = {
  key: string;
  label: string;
  value: string;
  variant: "sales" | "expenses" | "profit";
  icon: LucideIcon;
  trendPct: number | null;
  hint?: string;
  tooltip?: string;
};

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDate() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

/** Masque le bloc « Configurez votre commerce » 48 h après la création du commerce (serveur). */
const SETUP_CHECKLIST_MAX_MS = 2 * 24 * 60 * 60 * 1000;

function isSetupChecklistAutoHidden(businessCreatedAt: string | null | undefined): boolean {
  if (!businessCreatedAt) return false;
  const t = Date.parse(businessCreatedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= SETUP_CHECKLIST_MAX_MS;
}

export default function Dashboard() {
  const { activeStore } = useStore();
  const { displayName } = useUserProfile();
  const { canAccess, can } = usePermissions();
  const { matrixCan, matrixNavAccess } = useMatrixCan();
  const {
    canExpenses,
    canStockAlerts,
    canClientCredits,
    canAccess: canAccessPlan,
  } = usePlanFeatures();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [extraTopProducts, setExtraTopProducts] = useState<
    { productId: string; name: string; qty: number; amount: string }[]
  >([]);
  const [extraLowStock, setExtraLowStock] = useState<
    { productId: string; name: string; storeName: string; stock: number; min: number }[]
  >([]);
  const [loadingMoreTop, setLoadingMoreTop] = useState(false);
  const [loadingMoreLow, setLoadingMoreLow] = useState(false);
  const [topSliceHasNext, setTopSliceHasNext] = useState(false);
  const [lowSliceHasNext, setLowSliceHasNext] = useState(false);

  const loadData = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { periodStart, periodEnd } = getDashboardPeriodBounds();
      const res = await getDashboard({
        periodStart,
        periodEnd,
        storeId: activeStore?.id ?? undefined,
      });
      setData(res);
      setApiError(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : t.dashboard.loadError);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data) {
      setExtraTopProducts([]);
      setExtraLowStock([]);
      setTopSliceHasNext(false);
      setLowSliceHasNext(false);
      return;
    }
    setExtraTopProducts([]);
    setExtraLowStock([]);
    const topTotal = data.topProductsTotal ?? data.topProducts.length;
    setTopSliceHasNext(topTotal > data.topProducts.length);
    const lowTotal = data.lowStockItemsTotal ?? data.lowStockItems.length;
    setLowSliceHasNext(lowTotal > data.lowStockItems.length);
  }, [data]);

  const loadMoreTopProducts = useCallback(async () => {
    if (!data || loadingMoreTop) return;
    setLoadingMoreTop(true);
    try {
      const page = 1 + Math.floor(extraTopProducts.length / DASH_LIST_BATCH);
      const { periodStart, periodEnd } = getDashboardPeriodBounds();
      const res = await getDashboardTopProductsSlice({
        periodStart,
        periodEnd,
        storeId: activeStore?.id,
        page,
        size: DASH_LIST_BATCH,
      });
      setExtraTopProducts((prev) => [
        ...prev,
        ...res.content.map((p) => ({
          productId: p.productId,
          name: p.productName,
          qty: p.totalQuantity,
          amount: formatFCFA(p.totalRevenue),
        })),
      ]);
      setTopSliceHasNext(res.hasNext);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.msgLoadError);
    } finally {
      setLoadingMoreTop(false);
    }
  }, [data, activeStore?.id, extraTopProducts.length, loadingMoreTop]);

  const loadMoreLowStock = useCallback(async () => {
    if (!data || loadingMoreLow || !canStockAlerts) return;
    setLoadingMoreLow(true);
    try {
      const page = 1 + Math.floor(extraLowStock.length / DASH_LIST_BATCH);
      const res = await getDashboardLowStockSlice({
        storeId: activeStore?.id,
        page,
        size: DASH_LIST_BATCH,
      });
      setExtraLowStock((prev) => [
        ...prev,
        ...res.content.map((i) => ({
          productId: i.productId,
          name: i.productName,
          storeName: i.storeName,
          stock: i.quantity,
          min: i.minStock,
        })),
      ]);
      setLowSliceHasNext(res.hasNext);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.msgLoadError);
    } finally {
      setLoadingMoreLow(false);
    }
  }, [data, activeStore?.id, extraLowStock.length, loadingMoreLow, canStockAlerts]);

  const hideSetupChecklist = useMemo(() => {
    if (!data) return true;
    return isSetupChecklistAutoHidden(data.businessCreatedAt);
  }, [data]);

  // Welcome toast on first visit
  useEffect(() => {
    const key = "ecom360_welcomed";
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      notification.success({
        message: "Bienvenue sur 360 PME !",
        description: "Commencez par configurer votre boutique et ajouter vos produits.",
        placement: "topRight",
        duration: 6,
      });
    }
  }, []);

  const todayCards: DashboardStatCard[] = useMemo(() => {
    if (!data) return [];
    const rows: DashboardStatCard[] = [
      {
        key: "sales",
        label: t.dashboard.salesToday,
        value: formatFCFA(data.todayRevenue),
        variant: "sales",
        icon: Wallet,
        trendPct: null,
        tooltip: t.dashboard.tooltipSalesToday,
      },
    ];
    if (canExpenses && canAccess("expenses")) {
      rows.push({
        key: "expenses",
        label: t.dashboard.expensesToday,
        value: formatFCFA(data.todayExpenses ?? 0),
        variant: "expenses",
        icon: Receipt,
        trendPct: null,
        tooltip: t.dashboard.tooltipExpensesToday,
      });
    }
    const resultToday = data.todayRevenue - (data.todayExpenses ?? 0);
    rows.push({
      key: "todayResult",
      label: t.dashboard.resultToday,
      value: formatFCFA(resultToday),
      variant: resultToday >= 0 ? "profit" : "expenses",
      icon: PiggyBank,
      trendPct: null,
      tooltip: t.dashboard.tooltipResultToday,
    });
    return rows;
  }, [data, canExpenses, canAccess]);

  const expenseTrendPct = useMemo(
    () =>
      data != null ? pctChangeVsPrevious(data.periodExpenses, data.previousPeriodExpenses) : null,
    [data]
  );

  const periodCards: DashboardStatCard[] = useMemo(() => {
    if (!data) return [];
    const prevR = data.previousPeriodRevenue;
    const prevC = data.previousPeriodSalesCount;
    const prevP = data.previousPeriodProfit;

    const avgBasket =
      data.periodSalesCount > 0 ? Math.round(data.periodRevenue / data.periodSalesCount) : 0;
    const expenseRatioPct =
      data.periodRevenue > 0
        ? Math.round((data.periodExpenses / data.periodRevenue) * 1000) / 10
        : null;

    const lowTotal = data.lowStockItemsTotal ?? data.lowStockItems.length;

    const rows: DashboardStatCard[] = [
      {
        key: "pRev",
        label: t.dashboard.periodRevenue,
        value: formatFCFA(data.periodRevenue),
        variant: "sales",
        icon: Wallet,
        trendPct: pctChangeVsPrevious(data.periodRevenue, prevR),
        tooltip: t.dashboard.tooltipPeriodRevenue,
      },
      {
        key: "pTxn",
        label: t.dashboard.periodTransactions,
        value: String(data.periodSalesCount),
        variant: "profit",
        icon: ShoppingBag,
        trendPct: pctChangeVsPrevious(data.periodSalesCount, prevC),
        tooltip: t.dashboard.tooltipPeriodTransactions,
      },
      {
        key: "pBasket",
        label: t.dashboard.periodAvgBasket,
        value: formatFCFA(avgBasket),
        variant: "profit",
        icon: ShoppingCart,
        trendPct: null,
        tooltip: t.dashboard.tooltipPeriodAvgBasket,
      },
      {
        key: "pRatio",
        label: t.dashboard.periodExpenseRatio,
        value: expenseRatioPct != null ? `${expenseRatioPct} %` : "—",
        variant: "expenses",
        icon: Percent,
        trendPct: null,
        tooltip: t.dashboard.tooltipPeriodExpenseRatio,
      },
    ];

    if (can("SALES_READ") && can("EXPENSES_READ")) {
      rows.push({
        key: "pProfit",
        label: t.dashboard.periodProfit,
        value: formatFCFA(data.periodProfit),
        variant: data.periodProfit >= 0 ? "profit" : "expenses",
        icon: PiggyBank,
        trendPct: pctChangeVsPrevious(data.periodProfit, prevP),
        tooltip: t.dashboard.tooltipPeriodProfit,
      });
    }

    if (canStockAlerts) {
      rows.push({
        key: "pLowStock",
        label: t.dashboard.periodLowStockCount,
        value: String(lowTotal),
        variant: "expenses",
        icon: AlertTriangle,
        trendPct: null,
        tooltip: t.dashboard.tooltipPeriodLowStock,
      });
    }

    if (canClientCredits) {
      const debtors = data.debtorClientsCount ?? 0;
      rows.push({
        key: "pRecv",
        label: t.dashboard.periodReceivable,
        value: formatFCFA(data.totalReceivable ?? 0),
        variant: "sales",
        icon: CreditCard,
        trendPct: null,
        hint:
          debtors > 0 ? t.dashboard.periodDebtorsHint.replace("{n}", String(debtors)) : undefined,
        tooltip: t.dashboard.tooltipPeriodReceivable,
      });
    }

    return rows;
  }, [data, can, canStockAlerts, canClientCredits]);

  const todayCardSkeletonCount = 2 + (canExpenses && canAccess("expenses") ? 1 : 0);

  const periodCardSkeletonCount = 7;

  const topProducts = useMemo(() => {
    const base =
      data?.topProducts.map((p) => ({
        productId: p.productId,
        name: p.productName,
        qty: p.totalQuantity,
        amount: formatFCFA(p.totalRevenue),
      })) ?? [];
    return [...base, ...extraTopProducts];
  }, [data?.topProducts, extraTopProducts]);

  const lowStock = useMemo(() => {
    const base =
      data?.lowStockItems.map((i) => ({
        productId: i.productId,
        name: i.productName,
        storeName: i.storeName,
        stock: i.quantity,
        min: i.minStock,
      })) ?? [];
    return [...base, ...extraLowStock];
  }, [data?.lowStockItems, extraLowStock]);

  const topRemaining =
    data != null
      ? Math.max(0, (data.topProductsTotal ?? data.topProducts.length) - topProducts.length)
      : 0;
  const lowRemaining =
    data != null
      ? Math.max(0, (data.lowStockItemsTotal ?? data.lowStockItems.length) - lowStock.length)
      : 0;

  const recentSalesPaymentStats = useMemo(() => {
    if (!data?.recentSales?.length) {
      return {
        breakdown: [] as Array<{
          method: string;
          amount: string;
          pct: number;
          color: string;
        }>,
        collected: 0,
        credit: 0,
        total: 0,
      };
    }
    const byMethod: Record<string, number> = {};
    let collected = 0;
    let credit = 0;
    let total = 0;
    const labels: Record<string, string> = {
      cash: "Espèces",
      wave: "Wave",
      orange_money: "Orange Money",
      credit: "Crédit",
    };
    for (const s of data.recentSales) {
      const m = s.paymentMethod || "cash";
      const amt = s.total;
      byMethod[m] = (byMethod[m] || 0) + amt;
      total += amt;
      if (m === "credit") credit += amt;
      else collected += amt;
    }
    if (total === 0) {
      return { breakdown: [], collected: 0, credit: 0, total: 0 };
    }
    const breakdown = Object.entries(byMethod)
      .map(([method, amount]) => ({
        method: labels[method] || method,
        amount: formatFCFA(amount),
        pct: Math.round((amount / total) * 100),
        color: PAYMENT_COLORS[method] || "var(--color-primary)",
      }))
      .sort((a, b) => b.pct - a.pct);
    return { breakdown, collected, credit, total };
  }, [data?.recentSales]);

  const recentSales =
    data?.recentSales.map((s, i) => ({
      saleId: s.saleId,
      id: s.receiptNumber || String(i),
      time: formatTime(s.createdAt),
      items: "-",
      total: s.total,
      method:
        s.paymentMethod === "cash"
          ? "Espèces"
          : s.paymentMethod === "wave"
            ? "Wave"
            : s.paymentMethod === "orange_money"
              ? "Orange Money"
              : s.paymentMethod,
    })) ?? [];

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 260, height: 28 }} />
          <Skeleton.Input active style={{ width: 160, height: 18, marginTop: 10 }} />
        </div>
        <div className={styles.statsSection}>
          <Typography.Title level={5} className={styles.statsSectionTitle}>
            {t.dashboard.sectionToday}
          </Typography.Title>
          <Row gutter={[16, 16]}>
            {Array.from({ length: todayCardSkeletonCount }, (_, i) => (
              <Col xs={24} sm={12} lg={8} key={`t-${i}`}>
                <Card variant="borderless" className={styles.statCard}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))}
          </Row>
          <Collapse
            bordered={false}
            ghost
            className={styles.periodCollapse}
            defaultActiveKey={[]}
            expandIconPosition="end"
            items={[
              {
                key: "period",
                label: (
                  <div className={styles.periodCollapseLabel}>
                    <Typography.Title level={5} className={styles.periodCollapseHeading}>
                      {t.dashboard.sectionPeriod}
                    </Typography.Title>
                    <Skeleton.Input active size="small" style={{ width: 280, maxWidth: "100%" }} />
                  </div>
                ),
                children: (
                  <Row gutter={[16, 16]}>
                    {Array.from({ length: periodCardSkeletonCount }, (_, i) => (
                      <Col xs={24} sm={12} lg={8} key={`p-${i}`}>
                        <Card variant="borderless" className={styles.statCard}>
                          <Skeleton active paragraph={{ rows: 2 }} />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ),
              },
            ]}
          />
        </div>
        <div className={styles.tablesSection}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card variant="borderless" className={styles.card}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card variant="borderless" className={styles.card}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  const emptyData =
    !loading &&
    !apiError &&
    data != null &&
    data.todayRevenue === 0 &&
    (data.todayExpenses ?? 0) === 0 &&
    !data.recentSales.length;

  if (emptyData) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <header className={styles.header}>
          <div>
            <Typography.Title level={4} className={styles.pageTitle}>
              {getGreeting()}, {displayName}
            </Typography.Title>
            <div className={styles.headerMeta}>
              <Typography.Text type="secondary" className={styles.headerDate}>
                {formatDate()}
              </Typography.Text>
              {activeStore && <span className={styles.storeBadge}>{activeStore.name}</span>}
            </div>
          </div>
        </header>
        <Card variant="borderless" className={`${styles.card} ${styles.emptyCard}`}>
          <EmptyState
            icon={ShoppingCart}
            title={t.dashboard.emptyTitle}
            description={t.dashboard.emptySubtitle}
            action={
              <Button type="primary" size="large" onClick={() => navigate("/pos")}>
                {t.dashboard.emptyCta}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div>
          <Typography.Title level={4} className={styles.pageTitle}>
            {getGreeting()}, {displayName}
          </Typography.Title>
          <div className={styles.headerMeta}>
            <Typography.Text type="secondary" className={styles.headerDate}>
              {formatDate()}
            </Typography.Text>
            {activeStore && <span className={styles.storeBadge}>{activeStore.name}</span>}
          </div>
        </div>
      </header>

      {apiError && (
        <Alert
          message={apiError}
          type="warning"
          showIcon
          closable
          onClose={() => setApiError(null)}
          action={
            <Button size="small" onClick={loadData}>
              {t.dashboard.retryLoad}
            </Button>
          }
          className={styles.apiError}
        />
      )}

      {data?.analyticsLimitedToToday && (
        <Alert
          type="info"
          showIcon
          message={t.dashboard.starterPlanInfoTitle}
          description={t.dashboard.starterPlanInfoDesc}
          className={styles.apiError + " mb-4"}
        />
      )}

      {expenseTrendPct !== null &&
        expenseTrendPct > 0 &&
        canExpenses &&
        canAccess("expenses") &&
        data &&
        (data.periodSalesCount > 0 || data.periodExpenses > 0) && (
          <Alert
            type="info"
            showIcon
            message={t.dashboard.expenseRisingTitle}
            description={t.dashboard.expenseRisingDesc}
            action={
              <Button size="small" type="primary" onClick={() => navigate("/expenses")}>
                {t.dashboard.expenseRisingCta}
              </Button>
            }
            className={styles.apiError + " mb-4"}
          />
        )}

      {canClientCredits &&
        matrixCan("CLIENTS_READ", "clients") &&
        (data?.debtorClientsCount ?? 0) > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<CreditCard size={18} aria-hidden />}
            message={t.dashboard.creditFollowUpTitle}
            description={t.dashboard.creditFollowUpDesc
              .replace("{count}", String(data?.debtorClientsCount ?? 0))
              .replace("{amount}", formatFCFA(data?.totalReceivable ?? 0))}
            action={
              <Space size={8} wrap>
                <Button size="small" type="primary" onClick={() => navigate("/clients")}>
                  {t.dashboard.creditFollowUpCta}
                </Button>
                {canAccessPlan("reports", matrixNavAccess("reports")) ? (
                  <Button size="small" onClick={() => navigate("/reports")}>
                    {t.dashboard.creditFollowUpReports}
                  </Button>
                ) : null}
              </Space>
            }
            className={styles.apiError + " mb-4"}
          />
        )}

      {/* Store setup banner for users with no store */}
      <NoStoreBanner />

      {/* Onboarding : max 2 jours après création du commerce */}
      {!hideSetupChecklist && (
        <SetupChecklist
          hasProducts={(data?.totalProducts ?? 0) > 0}
          hasFirstSale={(data?.periodSalesCount ?? 0) > 0}
          hasClients={(data?.totalClients ?? 0) > 0}
        />
      )}

      {/* Quick actions — alignées sur les mêmes règles que le menu (canAccess par route). */}
      <section className={styles.quickActions} aria-label="Actions rapides">
        {canAccess("pos") && (
          <button
            type="button"
            className={`${styles.quickCard} ${styles.quickCardPrimary}`}
            onClick={() => navigate("/pos")}
          >
            <span className={styles.quickCardIcon}>
              <ShoppingCart size={22} />
            </span>
            <span className={styles.quickCardLabel}>Nouvelle vente</span>
          </button>
        )}
        {canAccess("products") && (
          <button type="button" className={styles.quickCard} onClick={() => navigate("/products")}>
            <span className={styles.quickCardIcon}>
              <Plus size={22} />
            </span>
            <span className={styles.quickCardLabel}>Ajouter produit</span>
          </button>
        )}
        {canExpenses && canAccess("expenses") && (
          <button type="button" className={styles.quickCard} onClick={() => navigate("/expenses")}>
            <span className={styles.quickCardIcon}>
              <FileText size={22} />
            </span>
            <span className={styles.quickCardLabel}>Dépense</span>
          </button>
        )}
        {canAccess("clients") && (
          <button type="button" className={styles.quickCard} onClick={() => navigate("/clients")}>
            <span className={styles.quickCardIcon}>
              <Users size={22} />
            </span>
            <span className={styles.quickCardLabel}>Clients</span>
          </button>
        )}
        {(data?.totalStores ?? 0) > 1 &&
          matrixCan("GLOBAL_VIEW_READ", "globalView") &&
          canAccessPlan("globalView", matrixNavAccess("globalView")) && (
            <button
              type="button"
              className={styles.quickCard}
              onClick={() => navigate("/vue-globale")}
            >
              <span className={styles.quickCardIcon}>
                <Store size={22} />
              </span>
              <span className={styles.quickCardLabel}>Vue globale</span>
            </button>
          )}
      </section>

      <section className={styles.statsSection} aria-label={t.dashboard.sectionToday}>
        <Typography.Title level={5} className={styles.statsSectionTitle}>
          {t.dashboard.sectionToday}
        </Typography.Title>
        <Row gutter={[16, 16]}>
          {todayCards.map(({ key, label, value, variant, icon: Icon, tooltip }) => (
            <Col xs={24} sm={12} lg={8} key={key}>
              <Card variant="borderless" className={`${styles.statCard} ${styles[variant]}`}>
                <div className={styles.statCardInner}>
                  <div className={styles.statLabelRow}>
                    <span className={styles.statIconWrap}>
                      <Icon size={20} className={styles.statIcon} aria-hidden />
                    </span>
                    <Typography.Text className={styles.statLabel}>{label}</Typography.Text>
                    {tooltip ? (
                      <Tooltip title={tooltip}>
                        <span className={styles.statTooltipHit} aria-label={tooltip}>
                          <Info size={14} aria-hidden />
                        </span>
                      </Tooltip>
                    ) : null}
                  </div>
                  <div className={styles.statRow}>
                    <span className={`amount ${styles.statValue}`}>{value}</span>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Card variant="borderless" className={styles.moneyStoryCard}>
          <Typography.Title level={5} className={styles.moneyStoryTitle}>
            {t.dashboard.moneyStoryTitle}
          </Typography.Title>
          <Typography.Paragraph type="secondary" className={styles.moneyStoryBanner}>
            {t.dashboard.periodDefaultBanner}
          </Typography.Paragraph>
          {recentSalesPaymentStats.total > 0 ? (
            <Typography.Paragraph className={styles.moneyStoryLine}>
              {t.dashboard.moneyStoryRecentPayments
                .replace("{collected}", formatFCFA(recentSalesPaymentStats.collected))
                .replace("{credit}", formatFCFA(recentSalesPaymentStats.credit))}
            </Typography.Paragraph>
          ) : null}
          {canClientCredits ? (
            <Typography.Paragraph className={styles.moneyStoryLine}>
              {t.dashboard.moneyStoryReceivable.replace(
                "{amount}",
                formatFCFA(data?.totalReceivable ?? 0)
              )}
            </Typography.Paragraph>
          ) : null}
          {can("SALES_READ") && can("EXPENSES_READ") && data ? (
            <Typography.Paragraph className={styles.moneyStoryLine}>
              {t.dashboard.moneyStoryPeriodProfit.replace(
                "{amount}",
                formatFCFA(data.periodProfit)
              )}
            </Typography.Paragraph>
          ) : null}
          <Space wrap size={8}>
            {canAccess("clients") ? (
              <Button type="link" size="small" onClick={() => navigate("/clients")}>
                {t.dashboard.moneyStoryDetailClients}
              </Button>
            ) : null}
            {canAccessPlan("reports", matrixNavAccess("reports")) ? (
              <Button type="link" size="small" onClick={() => navigate("/reports")}>
                {t.dashboard.moneyStoryDetailReports}
              </Button>
            ) : null}
          </Space>
        </Card>

        <Collapse
          bordered={false}
          ghost
          className={styles.periodCollapse}
          defaultActiveKey={[]}
          expandIconPosition="end"
          items={[
            {
              key: "period",
              label: (
                <div className={styles.periodCollapseLabel}>
                  <Typography.Title level={5} className={styles.periodCollapseHeading}>
                    {t.dashboard.sectionPeriod}
                  </Typography.Title>
                  {data?.periodStart && data?.periodEnd ? (
                    <>
                      <Typography.Text type="secondary" className={styles.periodCollapseMeta}>
                        {formatRangeSummaryFr(data.periodStart, data.periodEnd)}
                        {" · "}
                        <span className={`amount ${styles.periodCollapseMetaAmount}`}>
                          {formatFCFA(data.periodRevenue)}
                        </span>
                      </Typography.Text>
                      <Typography.Text type="secondary" className={styles.periodCollapseHint}>
                        {t.dashboard.periodCollapseHint}
                      </Typography.Text>
                    </>
                  ) : (
                    <Typography.Text type="secondary" className={styles.periodCollapseMeta}>
                      {t.dashboard.periodCollapseHint}
                    </Typography.Text>
                  )}
                </div>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  {periodCards.map(
                    ({ key, label, value, variant, icon: Icon, trendPct, hint, tooltip }) => (
                      <Col xs={24} sm={12} lg={8} key={key}>
                        <Card
                          variant="borderless"
                          className={`${styles.statCard} ${styles[variant]}`}
                        >
                          <div className={styles.statCardInner}>
                            <div className={styles.statLabelRow}>
                              <span className={styles.statIconWrap}>
                                <Icon size={20} className={styles.statIcon} aria-hidden />
                              </span>
                              <Typography.Text className={styles.statLabel}>
                                {label}
                              </Typography.Text>
                              {tooltip ? (
                                <Tooltip title={tooltip}>
                                  <span className={styles.statTooltipHit} aria-label={tooltip}>
                                    <Info size={14} aria-hidden />
                                  </span>
                                </Tooltip>
                              ) : null}
                            </div>
                            <div className={styles.statCol}>
                              <span className={`amount ${styles.statValue}`}>{value}</span>
                              {hint ? (
                                <Typography.Text type="secondary" className={styles.statHint}>
                                  {hint}
                                </Typography.Text>
                              ) : null}
                              {trendPct !== null ? (
                                <Tag
                                  color={trendPct >= 0 ? "success" : "warning"}
                                  className={styles.trend}
                                >
                                  {trendPct >= 0 ? (
                                    <TrendingUp size={12} aria-hidden />
                                  ) : (
                                    <TrendingDown size={12} aria-hidden />
                                  )}
                                  <span>
                                    {trendPct > 0 ? "+" : ""}
                                    {trendPct}%
                                  </span>
                                  <span className={styles.trendCaption}>
                                    {t.dashboard.vsPrevPeriod}
                                  </span>
                                </Tag>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      </Col>
                    )
                  )}
                </Row>
              ),
            },
          ]}
        />

        {recentSalesPaymentStats.total > 0 ? (
          <Card variant="borderless" className={styles.cashSplitCard}>
            <Typography.Title level={5} className={styles.cashSplitTitle}>
              {t.dashboard.cashSplitTitle}
            </Typography.Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Typography.Text type="secondary">{t.dashboard.cashSplitCollected}</Typography.Text>
                <div className={`amount ${styles.cashSplitAmount}`}>
                  {formatFCFA(recentSalesPaymentStats.collected)}
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Typography.Text type="secondary">{t.dashboard.cashSplitCredit}</Typography.Text>
                <div className={`amount ${styles.cashSplitAmount}`}>
                  {formatFCFA(recentSalesPaymentStats.credit)}
                </div>
              </Col>
            </Row>
            <Typography.Paragraph type="secondary" className={styles.cashSplitDisclaimer}>
              {t.dashboard.cashSplitDisclaimer}
            </Typography.Paragraph>
          </Card>
        ) : null}
      </section>

      <section className={styles.tablesSection} aria-label="Activité">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className={styles.cardTitle}>
                  <Package size={20} aria-hidden />
                  {t.dashboard.topProducts}
                </span>
              }
              variant="borderless"
              className={styles.card}
            >
              <div className="tableResponsive">
                <Table
                  dataSource={topProducts}
                  rowKey="productId"
                  pagination={false}
                  size="small"
                  className={styles.dataTable}
                  onRow={(r) => ({
                    style: { cursor: "pointer" },
                    onClick: () => navigate(`/products/${r.productId}`),
                  })}
                  columns={[
                    {
                      title: t.common.name,
                      dataIndex: "name",
                      ellipsis: true,
                    },
                    {
                      title: "Qté",
                      dataIndex: "qty",
                      width: 72,
                      align: "center",
                    },
                    {
                      title: "Montant",
                      dataIndex: "amount",
                      width: 110,
                      className: "amount",
                      align: "right",
                    },
                  ]}
                />
                {data && topSliceHasNext ? (
                  <div className={styles.tableFooterActions}>
                    <Button
                      type="default"
                      size="small"
                      loading={loadingMoreTop}
                      onClick={loadMoreTopProducts}
                    >
                      Charger {Math.min(DASH_LIST_BATCH, topRemaining)} suivants
                    </Button>
                    {topRemaining > 0 ? (
                      <Typography.Text type="secondary" className={styles.tableFooterMeta}>
                        Encore {topRemaining} produit{topRemaining > 1 ? "s" : ""} à afficher
                      </Typography.Text>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>
          </Col>
          {canStockAlerts ? (
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span className={styles.cardTitle}>
                    <AlertTriangle size={20} className={styles.alertIcon} aria-hidden />
                    {t.dashboard.lowStockAlerts}
                  </span>
                }
                extra={
                  lowStock.length > 0 && canAccess("products") ? (
                    <Button type="link" size="small" onClick={() => navigate("/products")}>
                      {t.dashboard.lowStockCta}
                    </Button>
                  ) : null
                }
                variant="borderless"
                className={`${styles.card} ${styles.alertCard}`}
              >
                <div className="tableResponsive">
                  <Table
                    dataSource={lowStock}
                    rowKey={(r) => `${r.productId}-${r.storeName}`}
                    pagination={false}
                    size="small"
                    className={styles.dataTable}
                    onRow={(r) => ({
                      style: { cursor: "pointer" },
                      onClick: () => navigate(`/products/${r.productId}`),
                    })}
                    columns={[
                      {
                        title: t.common.name,
                        dataIndex: "name",
                        ellipsis: true,
                      },
                      {
                        title: "Stock",
                        dataIndex: "stock",
                        width: 88,
                        render: (
                          val: number,
                          r: { productId: string; storeName: string; min: number }
                        ) => (
                          <Tag color={val < r.min ? "error" : "default"}>
                            {val} / {r.min}
                          </Tag>
                        ),
                      },
                    ]}
                  />
                  {data && lowSliceHasNext ? (
                    <div className={styles.tableFooterActions}>
                      <Button
                        type="default"
                        size="small"
                        loading={loadingMoreLow}
                        onClick={loadMoreLowStock}
                      >
                        Charger {Math.min(DASH_LIST_BATCH, lowRemaining)} suivants
                      </Button>
                      {lowRemaining > 0 ? (
                        <Typography.Text type="secondary" className={styles.tableFooterMeta}>
                          Encore {lowRemaining} ligne{lowRemaining > 1 ? "s" : ""} à afficher
                        </Typography.Text>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Card>
            </Col>
          ) : null}
        </Row>
      </section>

      <section className={styles.paymentSection} aria-label="Répartition des paiements">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className={styles.cardTitle}>
                  <CreditCard size={20} aria-hidden />
                  {t.dashboard.paymentBreakdown}
                </span>
              }
              variant="borderless"
              className={styles.card}
            >
              <div className={styles.paymentList}>
                {recentSalesPaymentStats.breakdown.map(({ method, amount, pct, color }) => (
                  <div key={method} className={styles.paymentRow}>
                    <div className={styles.paymentLabel}>
                      <span className={styles.paymentMethod}>{method}</span>
                      <span className={styles.paymentPct}>{pct}%</span>
                      <span className={`amount ${styles.paymentAmount}`}>{amount}</span>
                    </div>
                    <div className={styles.barBg} role="presentation">
                      <div
                        className={styles.barFill}
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className={styles.cardTitle}>
                  <Receipt size={20} aria-hidden />
                  Ventes récentes
                </span>
              }
              variant="borderless"
              className={styles.card}
              extra={
                matrixNavAccess("reports") &&
                canAccessPlan("reports", matrixNavAccess("reports")) ? (
                  <Button type="link" size="small" onClick={() => navigate("/reports")}>
                    Voir tout
                  </Button>
                ) : null
              }
            >
              <div className={styles.recentList}>
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className={styles.recentRow}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/receipt", { state: { saleId: sale.saleId } })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate("/receipt", {
                          state: { saleId: sale.saleId },
                        });
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className={styles.recentInfo}>
                      <span className={styles.recentTime}>{sale.time}</span>
                      <span className={styles.recentItems}>{sale.items}</span>
                    </div>
                    <div className={styles.recentRight}>
                      <span className={`amount ${styles.recentTotal}`}>
                        {sale.total.toLocaleString("fr-FR")} F
                      </span>
                      <Tag
                        className={styles.recentMethod}
                        color={
                          sale.method === "Espèces"
                            ? "default"
                            : sale.method === "Wave"
                              ? "processing"
                              : "warning"
                        }
                      >
                        {sale.method}
                      </Tag>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      </section>
    </div>
  );
}
