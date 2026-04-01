import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Skeleton, Alert, Button, Table, DatePicker } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { LucideIcon } from "lucide-react";
import {
  Store,
  TrendingUp,
  Package,
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Receipt,
  ShoppingBag,
  Wallet,
  TrendingDown,
} from "lucide-react";
import { getGlobalView } from "@/api/dashboard";
import type { GlobalViewResponse } from "@/api/dashboard";
import { t } from "@/i18n";
import {
  formatRangeSummaryFr,
  rangeFullCalendarMonth,
  rangeRollingWeekWithinCurrentMonth,
  rangeTodayLocal,
  toLocalYmd,
} from "@/utils/dateLocal";
import styles from "./VueGlobale.module.css";

type PeriodKey = "today" | "last7" | "thisMonth" | "month";

function getPeriodRange(
  key: PeriodKey,
  selectedMonth?: Dayjs | null
): { start: string; end: string } {
  if (key === "month") {
    const m = selectedMonth ?? dayjs();
    return rangeFullCalendarMonth(m.year(), m.month());
  }
  const now = new Date();
  if (key === "today") {
    return rangeTodayLocal();
  }
  if (key === "last7") {
    return rangeRollingWeekWithinCurrentMonth();
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: toLocalYmd(from),
    end: toLocalYmd(now),
  };
}

const frInteger = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function formatFCFA(n: number) {
  return `${frInteger.format(Math.round(n))} F`;
}

/** Montant + devise sur la carte KPI : pas de coupure à l’intérieur du nombre, taille fluide (voir CSS container). */
function KpiMoney({
  value,
  large,
  className,
}: {
  value: number;
  large?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value);
  const full = `${frInteger.format(rounded)} FCFA`;
  return (
    <div className={`${styles.kpiMoney} ${className ?? ""}`} aria-label={full} title={full}>
      <span className={`${styles.kpiMoneyAmount} ${large ? styles.kpiMoneyAmountLarge : ""}`}>
        {frInteger.format(rounded)}
      </span>
      <span className={styles.kpiMoneyCurrency}>FCFA</span>
    </div>
  );
}

function KpiCard({
  className,
  icon: Icon,
  iconWrapClass,
  label,
  children,
}: {
  className: string;
  icon: LucideIcon;
  iconWrapClass: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="borderless" className={className}>
      <div className={styles.kpiCardInner}>
        <div className={`${styles.kpiIconWrap} ${iconWrapClass}`} aria-hidden>
          <Icon size={24} strokeWidth={2.25} />
        </div>
        <div className={styles.kpiLabel}>{label}</div>
        <div className={styles.kpiValueSlot}>{children}</div>
      </div>
    </Card>
  );
}

function formatPeriodLabel(key: PeriodKey): string {
  if (key === "today") return "Aujourd'hui";
  if (key === "last7") return "7 derniers jours";
  if (key === "month") return "Un mois";
  return "Ce mois";
}

export default function VueGlobale() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(() => dayjs());
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
      const { start, end } = getPeriodRange(period, selectedMonth);
      const res = await getGlobalView({ periodStart: start, periodEnd: end });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, selectedMonth]);

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
            {[1, 2, 3, 4].map((i) => (
              <Skeleton.Button key={i} active style={{ width: 120 }} />
            ))}
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} variant="borderless" className={styles.kpiCard}>
                <div className={styles.kpiCardInner}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
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
          {(["today", "last7", "thisMonth", "month"] as const).map((key) => (
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
        {period === "month" && (
          <div className={styles.monthPickerWrap}>
            <label htmlFor="vue-globale-month" className={styles.monthPickerLabel}>
              Mois affiché
            </label>
            <DatePicker
              id="vue-globale-month"
              picker="month"
              value={selectedMonth}
              onChange={(d) => {
                if (d) setSelectedMonth(d);
              }}
              format="MMMM YYYY"
              allowClear={false}
              disabledDate={(current) =>
                current ? current.isAfter(dayjs().endOf("month")) : false
              }
              className={styles.monthPicker}
            />
          </div>
        )}
        {data && (
          <p className={styles.periodSummary}>
            {formatRangeSummaryFr(data.periodStart, data.periodEnd)}
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
            <section className={styles.section} aria-labelledby="kpi-heading">
              <div className={styles.kpiSectionIntro}>
                <h2 id="kpi-heading" className={styles.kpiSectionTitle}>
                  Synthèse
                </h2>
                <p className={styles.kpiSectionDesc}>
                  Indicateurs agrégés sur la période sélectionnée ci-dessus
                </p>
              </div>
              <div className={styles.kpiGrid}>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardHero}`}
                  icon={CircleDollarSign}
                  iconWrapClass={styles.kpiIconPrimary}
                  label="Chiffre d'affaires"
                >
                  <KpiMoney value={data.totalRevenue} large className={styles.kpiValuePrimary} />
                </KpiCard>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardToneSurface}`}
                  icon={Receipt}
                  iconWrapClass={styles.kpiIconNeutral}
                  label="Nombre de ventes"
                >
                  <div className={styles.kpiValue}>{frInteger.format(data.totalSalesCount)}</div>
                </KpiCard>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardToneAccent}`}
                  icon={ShoppingBag}
                  iconWrapClass={styles.kpiIconAccent}
                  label="Panier moyen"
                >
                  <KpiMoney value={Math.round(data.averageBasket)} />
                </KpiCard>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardToneExpense}`}
                  icon={Wallet}
                  iconWrapClass={styles.kpiIconWarning}
                  label="Dépenses"
                >
                  <KpiMoney value={data.totalExpenses} className={styles.kpiValueWarning} />
                </KpiCard>
                <KpiCard
                  className={`${styles.kpiCard} ${
                    data.totalProfit >= 0 ? styles.kpiCardToneProfit : styles.kpiCardToneLoss
                  }`}
                  icon={data.totalProfit >= 0 ? TrendingUp : TrendingDown}
                  iconWrapClass={
                    data.totalProfit >= 0 ? styles.kpiIconSuccess : styles.kpiIconWarning
                  }
                  label="Bénéfice"
                >
                  <KpiMoney
                    value={data.totalProfit}
                    className={
                      data.totalProfit >= 0 ? styles.kpiValueSuccess : styles.kpiValueWarning
                    }
                  />
                </KpiCard>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardToneSurface}`}
                  icon={Store}
                  iconWrapClass={styles.kpiIconNeutral}
                  label="Boutiques"
                >
                  <div className={styles.kpiValue}>{frInteger.format(data.storeCount)}</div>
                </KpiCard>
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
