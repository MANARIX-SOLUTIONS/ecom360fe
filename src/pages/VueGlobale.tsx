import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Skeleton, Alert, Button, Table } from "antd";
import { Store, TrendingUp, Package, AlertTriangle, BarChart3 } from "lucide-react";
import { getGlobalView } from "@/api/dashboard";
import type { GlobalViewResponse } from "@/api/dashboard";
import { t } from "@/i18n";
import styles from "./VueGlobale.module.css";

type PeriodKey = "today" | "last7" | "thisMonth";

function getPeriodRange(key: PeriodKey): { start: string; end: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  let from: Date;
  if (key === "today") {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (key === "last7") {
    from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return {
    start: from.toISOString().slice(0, 10),
    end: to.toISOString().slice(0, 10),
  };
}

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function formatPeriodLabel(key: PeriodKey): string {
  if (key === "today") return "Aujourd'hui";
  if (key === "last7") return "7 derniers jours";
  return "Ce mois";
}

function formatPeriodSummary(start: string, end: string, period: PeriodKey): string {
  if (period === "today") {
    return new Date(start).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const from = new Date(start).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const to = new Date(end).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${from} → ${to}`;
}

export default function VueGlobale() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GlobalViewResponse | null>(null);

  const load = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getPeriodRange(period);
      const res = await getGlobalView({ periodStart: start, periodEnd: end });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const maxRevenue = data?.salesByStore?.length
    ? Math.max(...data.salesByStore.map((s) => s.revenue), 1)
    : 1;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <Skeleton.Input active style={{ width: 200, height: 32 }} />
          <Skeleton.Input active style={{ width: 280, height: 20, marginTop: 12 }} />
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton.Button key={i} active style={{ width: 120 }} />
            ))}
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} variant="borderless" className={styles.kpiCard}>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            ))}
          </div>
          <Skeleton active paragraph={{ rows: 5 }} style={{ marginBottom: 32 }} />
          <div className={styles.twoCol}>
            <Skeleton active paragraph={{ rows: 6 }} />
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.heroBadge}>Multi-boutiques</p>
        <h1 className={styles.heroTitle}>Vue globale</h1>
        <p className={styles.heroSubtitle}>
          Toutes vos boutiques en un coup d&apos;œil — CA, répartition et performance
        </p>
        <div className={styles.periodTabs} role="tablist" aria-label="Choisir la période">
          {(["today", "last7", "thisMonth"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={period === key}
              aria-label={formatPeriodLabel(key)}
              className={`${styles.periodTab} ${period === key ? styles.periodTabActive : ""}`}
              onClick={() => setPeriod(key)}
            >
              {formatPeriodLabel(key)}
            </button>
          ))}
        </div>
        {data && (
          <p className={styles.periodSummary}>
            {formatPeriodSummary(data.periodStart, data.periodEnd, period)}
          </p>
        )}
      </header>

      <div className={styles.content}>
        {error && (
          <Alert
            message={error}
            type="warning"
            showIcon
            closable
            onClose={() => setError(null)}
            action={
              <Button size="small" onClick={load}>
                Réessayer
              </Button>
            }
            style={{ marginBottom: 24 }}
          />
        )}

        {data && (
          <>
            <section className={styles.section} aria-label="Indicateurs clés">
              <div className={styles.kpiGrid}>
                <Card
                  variant="borderless"
                  className={`${styles.kpiCard} ${styles.kpiCardHighlight}`}
                >
                  <div className={styles.kpiLabel}>Chiffre d&apos;affaires</div>
                  <div
                    className={`${styles.kpiValue} ${styles.kpiValuePrimary} ${styles.kpiValueLarge}`}
                  >
                    {formatFCFA(data.totalRevenue)}
                  </div>
                </Card>
                <Card variant="borderless" className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Nombre de ventes</div>
                  <div className={styles.kpiValue}>{data.totalSalesCount}</div>
                </Card>
                <Card variant="borderless" className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Panier moyen</div>
                  <div className={styles.kpiValue}>
                    {formatFCFA(Math.round(data.averageBasket))}
                  </div>
                </Card>
                <Card variant="borderless" className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Dépenses</div>
                  <div className={`${styles.kpiValue} ${styles.kpiValueWarning}`}>
                    {formatFCFA(data.totalExpenses)}
                  </div>
                </Card>
                <Card variant="borderless" className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Bénéfice</div>
                  <div
                    className={`${styles.kpiValue} ${
                      data.totalProfit >= 0 ? styles.kpiValueSuccess : styles.kpiValueWarning
                    }`}
                  >
                    {formatFCFA(data.totalProfit)}
                  </div>
                </Card>
                <Card variant="borderless" className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Boutiques</div>
                  <div className={styles.kpiValue}>{data.storeCount}</div>
                </Card>
              </div>
            </section>

            <section className={styles.section} aria-labelledby="repartition-heading">
              <div className={styles.sectionHead}>
                <h2 id="repartition-heading" className={styles.sectionTitle}>
                  <BarChart3 size={22} className={styles.sectionTitleIcon} aria-hidden />
                  Répartition par boutique
                </h2>
                {data.totalSalesCount > 0 && (
                  <button
                    type="button"
                    className={styles.sectionLink}
                    onClick={() => navigate("/sales")}
                  >
                    Voir les ventes
                  </button>
                )}
              </div>
              <div className={styles.card}>
                {data.salesByStore.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Store size={40} className={styles.emptyStateIcon} aria-hidden />
                    <p>Aucune vente sur la période pour vos boutiques.</p>
                  </div>
                ) : (
                  <div className={styles.storeBars}>
                    {data.salesByStore.map((store) => (
                      <div key={store.storeId} className={styles.storeBarRow}>
                        <span className={styles.storeBarName}>{store.storeName}</span>
                        <span className={styles.storeBarStats}>
                          <span className={styles.storeBarAmount}>{formatFCFA(store.revenue)}</span>
                          {" · "}
                          {store.salesCount} ventes
                          {" · "}
                          {store.sharePercent}%
                        </span>
                        <div className={styles.storeBarBg} role="presentation">
                          <div
                            className={styles.storeBarFill}
                            style={{
                              width: `${Math.max((100 * store.revenue) / maxRevenue, 4)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className={styles.twoCol}>
              <section className={styles.section} aria-labelledby="top-products-heading">
                <h2 id="top-products-heading" className={styles.sectionTitle}>
                  <TrendingUp size={22} className={styles.sectionTitleIcon} aria-hidden />
                  {t.dashboard.topProducts}
                </h2>
                <div className={styles.card}>
                  {data.topProducts.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Package size={36} className={styles.emptyStateIcon} aria-hidden />
                      <p>Aucune vente sur la période.</p>
                    </div>
                  ) : (
                    <Table
                      dataSource={data.topProducts.map((p) => ({
                        key: p.productId,
                        name: p.productName,
                        qty: p.totalQuantity,
                        revenue: p.totalRevenue,
                      }))}
                      pagination={false}
                      size="small"
                      className={styles.dataTable}
                      onRow={(r) => ({
                        onClick: () => navigate(`/products/${r.key}`),
                        style: { cursor: "pointer" },
                      })}
                      columns={[
                        { title: t.common.name, dataIndex: "name", ellipsis: true },
                        { title: "Qté", dataIndex: "qty", width: 64, align: "center" },
                        {
                          title: "CA",
                          dataIndex: "revenue",
                          width: 100,
                          align: "right",
                          render: (v: number) => <span className="amount">{formatFCFA(v)}</span>,
                        },
                      ]}
                    />
                  )}
                </div>
              </section>

              <section className={styles.section} aria-labelledby="low-stock-heading">
                <h2 id="low-stock-heading" className={styles.sectionTitle}>
                  <AlertTriangle size={22} className={styles.sectionTitleIcon} aria-hidden />
                  {t.dashboard.lowStockAlerts}
                </h2>
                <div className={styles.card}>
                  {data.lowStockItems.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Package size={36} className={styles.emptyStateIcon} aria-hidden />
                      <p>Aucune alerte stock — niveaux OK.</p>
                    </div>
                  ) : (
                    <ul className={styles.lowStockList}>
                      {data.lowStockItems.slice(0, 10).map((item) => (
                        <li
                          key={`${item.productId}-${item.storeName}`}
                          className={styles.lowStockItem}
                        >
                          <a
                            href={`/products/${item.productId}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/products/${item.productId}`);
                            }}
                          >
                            {item.productName}
                          </a>
                          <span
                            className={styles.lowStockBadge}
                            style={{
                              background: "rgba(255,77,79,0.12)",
                              color: "var(--color-error)",
                            }}
                          >
                            {item.quantity} / {item.minStock} · {item.storeName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
