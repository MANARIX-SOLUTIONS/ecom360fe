import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Skeleton,
  Empty,
  Button,
  message,
  notification,
  Alert,
} from "antd";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/hooks/useStore";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuthRole } from "@/hooks/useAuthRole";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { SetupChecklist } from "@/components/SetupChecklist";
import { NoStoreBanner } from "@/components/NoStoreBanner";
import { getDashboard, getDashboardLowStockSlice, getDashboardTopProductsSlice } from "@/api";
import { t } from "@/i18n";
import { ROLES } from "@/constants/roles";
import styles from "./Dashboard.module.css";

const DASH_LIST_BATCH = 10;

const PAYMENT_COLORS: Record<string, string> = {
  cash: "var(--color-primary)",
  wave: "var(--color-success)",
  orange_money: "var(--color-warning)",
  credit: "var(--color-danger)",
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
  const { can, role } = useAuthRole();
  const { matrixCan, matrixNavAccess } = useMatrixCan();
  const { canExpenses, canStockAlerts, canAccess: canAccessPlan } = usePlanFeatures();
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
      const res = await getDashboard({
        storeId: activeStore?.id ?? undefined,
      });
      setData(res);
      setApiError(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Erreur chargement");
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
      const res = await getDashboardTopProductsSlice({
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
      message.error(e instanceof Error ? e.message : "Erreur chargement");
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
      message.error(e instanceof Error ? e.message : "Erreur chargement");
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

  const statCards = data
    ? [
        {
          key: "sales",
          label: t.dashboard.salesToday,
          value: formatFCFA(data.todayRevenue),
          prevValue: null as string | null,
          trend: 0,
          up: true,
          variant: "sales" as const,
          icon: Wallet,
        },
        ...(canExpenses && can("expenses")
          ? [
              {
                key: "expenses",
                label: t.dashboard.expensesToday,
                value: formatFCFA(data.todayExpenses ?? 0),
                prevValue: null,
                trend: 0,
                up: false,
                variant: "expenses" as const,
                icon: Receipt,
              },
            ]
          : []),
        ...(role === ROLES.PROPRIETAIRE
          ? [
              {
                key: "profit",
                label: t.dashboard.profitEstimate,
                value: formatFCFA(data.periodProfit),
                prevValue: null,
                trend: 0,
                up: data.periodProfit >= 0,
                variant: "profit" as const,
                icon: PiggyBank,
              },
            ]
          : []),
      ]
    : [];

  const statCardSkeletonCount =
    1 + (canExpenses && can("expenses") ? 1 : 0) + (role === ROLES.PROPRIETAIRE ? 1 : 0);

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

  const paymentBreakdown = (() => {
    if (!data?.recentSales.length) return [];
    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const s of data.recentSales) {
      const m = s.paymentMethod || "cash";
      byMethod[m] = (byMethod[m] || 0) + s.total;
      total += s.total;
    }
    if (total === 0) return [];
    const labels: Record<string, string> = {
      cash: "Espèces",
      wave: "Wave",
      orange_money: "Orange Money",
      credit: "Crédit",
    };
    return Object.entries(byMethod)
      .map(([method, amount]) => ({
        method: labels[method] || method,
        amount: formatFCFA(amount),
        pct: Math.round((amount / total) * 100),
        color: PAYMENT_COLORS[method] || "var(--color-primary)",
      }))
      .sort((a, b) => b.pct - a.pct);
  })();

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 260, height: 28 }} />
          <Skeleton.Input active style={{ width: 160, height: 18, marginTop: 10 }} />
        </div>
        <div className={styles.statsSection}>
          <Row gutter={[16, 16]}>
            {Array.from({ length: statCardSkeletonCount }, (_, i) => (
              <Col xs={24} sm={12} lg={8} key={i}>
                <Card variant="borderless" className={styles.statCard}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))}
          </Row>
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
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className={styles.emptyDescription}>
                <Typography.Text strong className={styles.emptyTitle}>
                  {t.dashboard.emptyTitle}
                </Typography.Text>
                <Typography.Text type="secondary" className={styles.emptySubtitle}>
                  {t.dashboard.emptySubtitle}
                </Typography.Text>
              </div>
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
              Réessayer
            </Button>
          }
          className={styles.apiError}
        />
      )}

      {data?.analyticsLimitedToToday && (
        <Alert
          type="info"
          showIcon
          message="Vue du jour (plan Starter)"
          description="Les chiffres ci-dessous concernent uniquement aujourd’hui. Passez au plan Pro pour analyser la semaine, le mois et exporter des rapports."
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

      {/* Quick actions */}
      <section className={styles.quickActions} aria-label="Actions rapides">
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
        <button type="button" className={styles.quickCard} onClick={() => navigate("/products")}>
          <span className={styles.quickCardIcon}>
            <Plus size={22} />
          </span>
          <span className={styles.quickCardLabel}>Ajouter produit</span>
        </button>
        {canExpenses && can("expenses") && (
          <button type="button" className={styles.quickCard} onClick={() => navigate("/expenses")}>
            <span className={styles.quickCardIcon}>
              <FileText size={22} />
            </span>
            <span className={styles.quickCardLabel}>Dépense</span>
          </button>
        )}
        <button type="button" className={styles.quickCard} onClick={() => navigate("/clients")}>
          <span className={styles.quickCardIcon}>
            <Users size={22} />
          </span>
          <span className={styles.quickCardLabel}>Clients</span>
        </button>
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

      <section className={styles.statsSection} aria-label="Indicateurs du jour">
        <Row gutter={[16, 16]}>
          {statCards.map(({ key, label, value, prevValue, trend, up, variant, icon: Icon }) => (
            <Col xs={24} sm={12} lg={8} key={key}>
              <Card variant="borderless" className={`${styles.statCard} ${styles[variant]}`}>
                <div className={styles.statCardInner}>
                  <div className={styles.statLabelRow}>
                    <span className={styles.statIconWrap}>
                      <Icon size={20} className={styles.statIcon} aria-hidden />
                    </span>
                    <Typography.Text className={styles.statLabel}>{label}</Typography.Text>
                  </div>
                  <div className={styles.statRow}>
                    <div>
                      <span className={`amount ${styles.statValue}`}>{value}</span>
                      {prevValue != null && (
                        <span className={styles.statPrev}>vs {prevValue} hier</span>
                      )}
                    </div>
                    {trend !== 0 && (
                      <Tag color={up ? "success" : "warning"} className={styles.trend}>
                        {up ? (
                          <TrendingUp size={12} aria-hidden />
                        ) : (
                          <TrendingDown size={12} aria-hidden />
                        )}
                        <span>{trend}%</span>
                      </Tag>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
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
                {paymentBreakdown.map(({ method, amount, pct, color }) => (
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
