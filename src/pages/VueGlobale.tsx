import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Skeleton, Alert, Button, Table, DatePicker, Typography } from "antd";
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
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { getGlobalView } from "@/api/dashboard";
import type { GlobalViewResponse } from "@/api/dashboard";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/i18n";
import { formatRangeSummaryFr } from "@/utils/dateLocal";
import {
  type GlobalViewPeriodKey,
  isCalendarQuarterAfterCurrent,
  isCalendarYearAfterCurrent,
  resolveGlobalViewPeriodRange,
} from "@/utils/periodRanges";
import styles from "./VueGlobale.module.css";

type PeriodKey = GlobalViewPeriodKey;

const PERIOD_TAB_KEYS: PeriodKey[] = ["today", "last7", "thisMonth", "month", "quarter", "year"];

const frInteger = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function formatFCFA(n: number) {
  return `${frInteger.format(Math.round(n))} F`;
}

/** Montant + devise sur la carte KPI : pas de coupure à l’intérieur du nombre. */
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

function ExecutiveSummary({ data }: { data: GlobalViewResponse }) {
  const sorted = useMemo(
    () => [...data.salesByStore].sort((a, b) => b.revenue - a.revenue),
    [data.salesByStore]
  );
  const leader = sorted[0];
  const rev = data.totalRevenue;
  const netMarginPct = rev > 0 ? Math.round((data.totalProfit / rev) * 1000) / 10 : null;
  const expenseRatioPct =
    rev > 0 ? Math.min(100, Math.round((data.totalExpenses / rev) * 1000) / 10) : null;

  const profitPositive = data.totalProfit >= 0;

  const showExpenseBar = rev > 0 && data.totalSalesCount > 0 && expenseRatioPct != null;

  return (
    <div className={styles.execSummary}>
      <div className={styles.execSummaryInner}>
        <div className={styles.execSummaryHeader}>
          <div className={styles.execSummaryTitleRow}>
            <span className={styles.execSummaryIcon} aria-hidden>
              <Sparkles size={20} strokeWidth={2} />
            </span>
            <Typography.Title level={4} className={styles.execSummaryTitle}>
              {t.globalView.execSummaryTitle}
            </Typography.Title>
          </div>
          {netMarginPct != null && data.totalSalesCount > 0 && (
            <span
              className={`${styles.execChip} ${profitPositive ? styles.execChipPositive : styles.execChipNegative}`}
            >
              {t.globalView.execSummaryMarginLabel} <strong>{netMarginPct}%</strong>
            </span>
          )}
        </div>

        {data.totalSalesCount === 0 ? (
          <p className={styles.execSummaryMuted}>{t.globalView.execSummaryNoActivity}</p>
        ) : (
          <>
            <div className={styles.execHeroMoney}>
              <KpiMoney value={data.totalRevenue} large className={styles.execHeroMoneyInner} />
            </div>
            <p className={styles.execSummaryLine}>
              {t.globalView.execSummarySalesLine
                .replace("{count}", frInteger.format(data.totalSalesCount))
                .replace("{basket}", formatFCFA(data.averageBasket))}
            </p>

            {showExpenseBar && (
              <div className={styles.execBarBlock}>
                <div className={styles.execBarTrack} role="img" aria-hidden>
                  <div
                    className={styles.execBarSegExpense}
                    style={{ width: `${expenseRatioPct}%` }}
                  />
                  <div
                    className={styles.execBarSegRemainder}
                    style={{ width: `${100 - expenseRatioPct}%` }}
                  />
                </div>
                <div className={styles.execBarLegend}>
                  <span>
                    <i className={styles.execDotExpense} />{" "}
                    {t.globalView.execSummaryExpensePressureLabel}{" "}
                    <strong>{expenseRatioPct}%</strong>
                  </span>
                  <span className={styles.execLegendMuted}>
                    {t.globalView.execSummaryLegendMarginNote}{" "}
                    <strong
                      className={profitPositive ? styles.execStrongPos : styles.execStrongNeg}
                    >
                      {netMarginPct != null ? `${netMarginPct}%` : "—"}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {leader && leader.revenue > 0 && (
              <div className={styles.execLeader}>
                <span className={styles.execLeaderLabel}>
                  {t.globalView.execSummaryTopStoreLabel}
                </span>
                <span className={styles.execLeaderValue}>
                  {t.globalView.execSummaryTopStoreShare
                    .replace("{name}", leader.storeName)
                    .replace("{percent}", String(leader.sharePercent))}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function VueGlobale() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(() => dayjs());
  const [selectedQuarter, setSelectedQuarter] = useState<Dayjs>(() => dayjs());
  const [selectedYear, setSelectedYear] = useState<Dayjs>(() => dayjs());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GlobalViewResponse | null>(null);

  const periodLabels: Record<PeriodKey, string> = {
    today: t.globalView.periodToday,
    last7: t.globalView.periodLast7,
    thisMonth: t.globalView.periodThisMonth,
    month: t.globalView.periodPickMonth,
    quarter: t.globalView.periodQuarter,
    year: t.globalView.periodYear,
  };

  const periodAnchors = useMemo(
    () => ({
      selectedMonth,
      selectedQuarter,
      selectedYear,
    }),
    [selectedMonth, selectedQuarter, selectedYear]
  );

  const load = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { start, end } = resolveGlobalViewPeriodRange(period, periodAnchors);
      const res = await getGlobalView({ periodStart: start, periodEnd: end });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.globalView.loadError);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, periodAnchors]);

  useEffect(() => {
    load();
  }, [load]);

  const maxRevenue = data?.salesByStore?.length
    ? Math.max(...data.salesByStore.map((s) => s.revenue), 1)
    : 1;

  const rankedStores = useMemo(() => {
    if (!data?.salesByStore.length) return [];
    return [...data.salesByStore].sort((a, b) => b.revenue - a.revenue);
  }, [data?.salesByStore]);

  const hasStoreActivity =
    (data?.salesByStore.length ?? 0) > 0 ||
    (data?.totalSalesCount ?? 0) > 0 ||
    (data?.totalExpenses ?? 0) > 0;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.heroBackdrop} aria-hidden />
          <div className={styles.heroContent}>
            <Skeleton.Input active style={{ width: 200, height: 32 }} />
            <Skeleton.Input active style={{ width: 280, height: 20, marginTop: 12 }} />
            <div className={styles.periodTabs}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton.Button key={i} active style={{ width: 100 }} />
              ))}
            </div>
          </div>
        </div>
        <div className={styles.content}>
          <Skeleton active paragraph={{ rows: 2 }} className={styles.execSkeleton} />
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
        <div className={styles.heroBackdrop} aria-hidden />
        <div className={styles.heroContent}>
          <p className={styles.heroBadge}>{t.globalView.heroBadge}</p>
          <h1 className={styles.heroTitle}>{t.globalView.title}</h1>
          <p className={styles.heroSubtitle}>{t.globalView.subtitle}</p>
          <div
            className={styles.periodTabs}
            role="tablist"
            aria-label={t.globalView.periodTabsAria}
          >
            {PERIOD_TAB_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={period === key}
                aria-label={periodLabels[key]}
                className={`${styles.periodTab} ${period === key ? styles.periodTabActive : ""}`}
                onClick={() => setPeriod(key)}
              >
                {periodLabels[key]}
              </button>
            ))}
          </div>
          {period === "month" && (
            <div className={styles.monthPickerWrap}>
              <label htmlFor="vue-globale-month" className={styles.monthPickerLabel}>
                {t.globalView.monthDisplayedLabel}
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
          {period === "quarter" && (
            <div className={styles.monthPickerWrap}>
              <label htmlFor="vue-globale-quarter" className={styles.monthPickerLabel}>
                {t.globalView.quarterDisplayedLabel}
              </label>
              <DatePicker
                id="vue-globale-quarter"
                picker="quarter"
                value={selectedQuarter}
                onChange={(d) => {
                  if (d) setSelectedQuarter(d);
                }}
                format="[T]Q YYYY"
                allowClear={false}
                disabledDate={(current) =>
                  current ? isCalendarQuarterAfterCurrent(current) : false
                }
                className={styles.monthPicker}
              />
            </div>
          )}
          {period === "year" && (
            <div className={styles.monthPickerWrap}>
              <label htmlFor="vue-globale-year" className={styles.monthPickerLabel}>
                {t.globalView.yearDisplayedLabel}
              </label>
              <DatePicker
                id="vue-globale-year"
                picker="year"
                value={selectedYear}
                onChange={(d) => {
                  if (d) setSelectedYear(d);
                }}
                format="YYYY"
                allowClear={false}
                disabledDate={(current) => (current ? isCalendarYearAfterCurrent(current) : false)}
                className={styles.monthPicker}
              />
            </div>
          )}
          {data && (
            <p className={styles.periodSummary}>
              {formatRangeSummaryFr(data.periodStart, data.periodEnd)}
            </p>
          )}
        </div>
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
                {t.globalView.retry}
              </Button>
            }
            className={styles.alertBanner}
          />
        )}

        {data && (
          <>
            <ExecutiveSummary data={data} />

            <section className={styles.section} aria-labelledby="kpi-heading">
              <div className={styles.sectionIntroPremium}>
                <h2 id="kpi-heading" className={styles.sectionIntroTitle}>
                  {t.globalView.synthesisTitle}
                </h2>
                <p className={styles.sectionIntroDesc}>{t.globalView.synthesisDesc}</p>
              </div>
              <div className={styles.kpiGrid}>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardHero} ${styles.kpiSpan2}`}
                  icon={CircleDollarSign}
                  iconWrapClass={styles.kpiIconPrimary}
                  label={t.globalView.kpiRevenue}
                >
                  <KpiMoney value={data.totalRevenue} large className={styles.kpiValuePrimary} />
                </KpiCard>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardToneSurface}`}
                  icon={Receipt}
                  iconWrapClass={styles.kpiIconNeutral}
                  label={t.globalView.kpiSalesCount}
                >
                  <div className={styles.kpiValue}>{frInteger.format(data.totalSalesCount)}</div>
                </KpiCard>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardToneAccent}`}
                  icon={ShoppingBag}
                  iconWrapClass={styles.kpiIconAccent}
                  label={t.globalView.kpiAvgBasket}
                >
                  <KpiMoney value={Math.round(data.averageBasket)} />
                </KpiCard>
                <KpiCard
                  className={`${styles.kpiCard} ${styles.kpiCardToneExpense}`}
                  icon={Wallet}
                  iconWrapClass={styles.kpiIconWarning}
                  label={t.globalView.kpiExpenses}
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
                  label={t.globalView.kpiProfit}
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
                  label={t.globalView.kpiStores}
                >
                  <div className={styles.kpiValue}>{frInteger.format(data.storeCount)}</div>
                </KpiCard>
              </div>
            </section>

            <section className={styles.section} aria-labelledby="repartition-heading">
              <div className={styles.sectionHead}>
                <h2 id="repartition-heading" className={styles.sectionTitle}>
                  <BarChart3 size={22} className={styles.sectionTitleIcon} aria-hidden />
                  {t.globalView.sectionStoresTitle}
                </h2>
                <div className={styles.sectionLinks}>
                  {data.totalSalesCount > 0 && (
                    <button
                      type="button"
                      className={styles.sectionLink}
                      onClick={() => navigate("/sales")}
                    >
                      {t.globalView.linkSeeSales}
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  )}
                  {data.totalExpenses > 0 && (
                    <button
                      type="button"
                      className={styles.sectionLink}
                      onClick={() => navigate("/expenses")}
                    >
                      {t.globalView.linkSeeExpenses}
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.panel}>
                {!hasStoreActivity ? (
                  <EmptyState
                    compact
                    icon={Store}
                    title={t.globalView.emptyStoresTitle}
                    description={t.globalView.emptyStoresDesc}
                  />
                ) : (
                  <div className={styles.storeBars}>
                    {rankedStores.map((store, index) => {
                      const displayName =
                        store.storeId == null ? t.globalView.storeUnassignedName : store.storeName;
                      return (
                        <div key={store.storeId ?? "unassigned"} className={styles.storeBarRow}>
                          <div className={styles.storeBarHead}>
                            <span className={styles.storeRank} aria-hidden>
                              {index + 1}
                            </span>
                            <span className={styles.storeBarName}>{displayName}</span>
                          </div>
                          <span className={styles.storeBarStats}>
                            <span className={styles.storeBarAmount}>
                              {formatFCFA(store.revenue)}
                            </span>
                            {" · "}
                            {store.salesCount} {t.globalView.storeSalesSuffix}
                            {store.revenue > 0 && (
                              <>
                                {" · "}
                                <span className={styles.storeShare}>{store.sharePercent}% CA</span>
                              </>
                            )}
                          </span>
                          <div className={styles.storeBarMetrics}>
                            <span>
                              {t.globalView.storeExpensesLabel}{" "}
                              <strong className={styles.storeMetricExpense}>
                                {formatFCFA(store.expenses)}
                              </strong>
                              {store.expenses > 0 && data.totalExpenses > 0 && (
                                <span className={styles.storeMetricMuted}>
                                  {" "}
                                  ({store.expenseSharePercent}%)
                                </span>
                              )}
                            </span>
                            <span>
                              {t.globalView.storeProfitLabel}{" "}
                              <strong
                                className={
                                  store.profit >= 0
                                    ? styles.storeMetricProfit
                                    : styles.storeMetricLoss
                                }
                              >
                                {formatFCFA(store.profit)}
                              </strong>
                            </span>
                          </div>
                          {store.revenue > 0 && (
                            <div className={styles.storeBarBg} role="presentation">
                              <div
                                className={styles.storeBarFill}
                                style={{
                                  width: `${Math.max((100 * store.revenue) / maxRevenue, 4)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                <div className={styles.panel}>
                  {data.topProducts.length === 0 ? (
                    <EmptyState
                      compact
                      icon={Package}
                      title={t.globalView.emptyProductsTitle}
                      description={t.globalView.emptyProductsDesc}
                    />
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
                      className={styles.dataTablePremium}
                      onRow={(r) => ({
                        onClick: () => navigate(`/products/${r.key}`),
                        style: { cursor: "pointer" },
                      })}
                      columns={[
                        { title: t.common.name, dataIndex: "name", ellipsis: true },
                        {
                          title: t.globalView.columnQtyShort,
                          dataIndex: "qty",
                          width: 64,
                          align: "center",
                        },
                        {
                          title: t.globalView.columnRevenueShort,
                          dataIndex: "revenue",
                          width: 100,
                          align: "right",
                          render: (v: number) => (
                            <span className={styles.tableAmount}>{formatFCFA(v)}</span>
                          ),
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
                <div className={styles.panel}>
                  {data.lowStockItems.length === 0 ? (
                    <EmptyState
                      compact
                      icon={AlertTriangle}
                      title={t.globalView.emptyStockTitle}
                      description={t.globalView.emptyStockDesc}
                    />
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
