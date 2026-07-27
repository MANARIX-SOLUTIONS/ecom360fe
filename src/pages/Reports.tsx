import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Tabs,
  Button,
  Typography,
  Space,
  Row,
  Col,
  message,
  Skeleton,
  Table,
  Tag,
  Modal,
  DatePicker,
  Drawer,
} from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  FileDown,
  Wallet,
  Receipt,
  PiggyBank,
  ShoppingCart,
  Ban,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Percent,
  CircleHelp,
} from "lucide-react";
import { t } from "@/i18n";
import styles from "./Reports.module.css";
import { getDashboard, voidSale } from "@/api";
import { formatRangeSummaryFr, isYmdInInclusiveRange, ymdFromIsoLocal } from "@/utils/dateLocal";
import { buildPeriodChartData } from "@/utils/reportChartData";
import {
  type ReportsPeriodKey,
  isCalendarQuarterAfterCurrent,
  isCalendarYearAfterCurrent,
  resolveReportsPeriodRange,
} from "@/utils/periodRanges";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/EmptyState";
import { useBusinessProfile } from "@/contexts/BusinessProfileContext";
import { useStore } from "@/hooks/useStore";
import { pctChangeVsPrevious } from "@/utils/kpiDelta";
import {
  buildPaymentRowsFromSales,
  buildReportExportSnapshot,
  getReportPeriodLabel,
  REPORT_PAYMENT_LABELS,
} from "@/utils/reportExport";

type TabKey = ReportsPeriodKey;

type ReportKpiCard = {
  key: string;
  label: string;
  value: string;
  icon: typeof Wallet;
  color: string;
  bg: string;
  trendPct: number | null;
  /** Si true : une baisse du pourcentage est favorable (ex. dépenses). */
  trendInverted?: boolean;
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "var(--color-primary)",
  wave: "var(--color-success)",
  orange_money: "var(--color-warning)",
  credit: "var(--color-danger)",
};

const LABELS = REPORT_PAYMENT_LABELS;

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Reports() {
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();
  const { canExportPdf, canExportExcel, canAdvancedReports } = usePlanFeatures();
  const { canAccess } = usePermissions();
  const { profile } = useBusinessProfile();
  const { activeStore } = useStore();
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const [exportExcelLoading, setExportExcelLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("week");
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(() => dayjs());
  const [selectedQuarter, setSelectedQuarter] = useState<Dayjs>(() => dayjs());
  const [selectedYear, setSelectedYear] = useState<Dayjs>(() => dayjs());
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const dashboardFetchIdRef = useRef(0);

  const periodAnchors = useMemo(
    () => ({
      selectedMonth,
      selectedQuarter,
      selectedYear,
    }),
    [selectedMonth, selectedQuarter, selectedYear]
  );

  const periodRange = useMemo(
    () => resolveReportsPeriodRange(activeTab, periodAnchors),
    [activeTab, periodAnchors]
  );

  /** Plage effective renvoyée par l’API (rétention plan, etc.). */
  const effectivePeriodRange = useMemo(() => {
    if (data?.periodStart && data?.periodEnd) {
      return { start: data.periodStart, end: data.periodEnd };
    }
    return periodRange;
  }, [data?.periodStart, data?.periodEnd, periodRange]);

  const loadData = useCallback(() => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    const { start, end } = resolveReportsPeriodRange(activeTab, periodAnchors);
    const fetchId = ++dashboardFetchIdRef.current;
    setLoading(true);
    getDashboard({
      periodStart: start,
      periodEnd: end,
      storeId: activeStore?.id,
    })
      .then((res) => {
        if (fetchId !== dashboardFetchIdRef.current) return;
        setData(res);
      })
      .catch((e) => {
        if (fetchId !== dashboardFetchIdRef.current) return;
        message.error(e instanceof Error ? e.message : t.reports.msgLoadError);
        setData(null);
      })
      .finally(() => {
        if (fetchId !== dashboardFetchIdRef.current) return;
        setLoading(false);
      });
  }, [activeTab, periodAnchors, activeStore?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!canAdvancedReports && (activeTab === "quarter" || activeTab === "year")) {
      setActiveTab("month");
    }
  }, [canAdvancedReports, activeTab]);

  const handleVoidSale = useCallback(
    (saleId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!matrixCan("SALES_DELETE", "reports")) return;
      Modal.confirm({
        title: t.sales.voidSale,
        content: t.sales.voidSaleConfirm,
        okText: t.sales.voidSale,
        okType: "danger",
        cancelText: t.common.cancel,
        onOk: async () => {
          setVoidingId(saleId);
          try {
            await voidSale(saleId);
            message.success(t.sales.saleCancelled);
            loadData();
          } catch (err) {
            message.error(err instanceof Error ? err.message : t.sales.cancelSaleFailed);
          } finally {
            setVoidingId(null);
          }
        },
      });
    },
    [matrixCan, loadData]
  );

  const salesInPeriod = useMemo(() => {
    if (!data?.recentSales?.length) return [];
    const { start, end } = effectivePeriodRange;
    return data.recentSales.filter((s) =>
      isYmdInInclusiveRange(ymdFromIsoLocal(s.createdAt), start, end)
    );
  }, [data, effectivePeriodRange.start, effectivePeriodRange.end]);

  const chartData = useMemo(() => {
    const dailySales = data?.periodDailySales ?? [];
    const dailyExpenses = data?.periodDailyExpenses ?? [];
    if (dailySales.length || dailyExpenses.length) {
      return buildPeriodChartData(
        dailySales,
        dailyExpenses,
        effectivePeriodRange.start,
        effectivePeriodRange.end
      );
    }
    // Fallback API ancienne : ventes récentes seulement (sans dépenses).
    if (!salesInPeriod.length) return [];
    return buildPeriodChartData(
      salesInPeriod.map((s) => ({
        date: ymdFromIsoLocal(s.createdAt),
        amount: s.total,
      })),
      [],
      effectivePeriodRange.start,
      effectivePeriodRange.end
    );
  }, [
    data?.periodDailySales,
    data?.periodDailyExpenses,
    salesInPeriod,
    effectivePeriodRange.start,
    effectivePeriodRange.end,
  ]);

  const paymentAmountRows = useMemo(() => {
    if (data?.periodPaymentBreakdown?.length) {
      const total = data.periodPaymentBreakdown.reduce((sum, r) => sum + r.amount, 0);
      if (total === 0) return [];
      return [...data.periodPaymentBreakdown]
        .map((row) => {
          const method = row.method || "cash";
          return {
            key: method,
            label: LABELS[method] || method,
            amount: row.amount,
            pct: Math.round((row.amount / total) * 100),
          };
        })
        .sort((a, b) => b.amount - a.amount);
    }
    if (!salesInPeriod.length) return [];
    return buildPaymentRowsFromSales(salesInPeriod).map((row) => {
      const method = Object.entries(LABELS).find(([, label]) => label === row.label)?.[0] ?? "cash";
      return {
        key: method,
        label: row.label,
        amount: row.amount,
        pct: row.pct,
      };
    });
  }, [data?.periodPaymentBreakdown, salesInPeriod]);

  const paymentData = useMemo(
    () =>
      paymentAmountRows.map((row) => ({
        name: row.label,
        value: row.pct,
        color: PAYMENT_COLORS[row.key] || "var(--color-primary)",
      })),
    [paymentAmountRows]
  );

  const kpiCards: ReportKpiCard[] = useMemo(() => {
    if (!data) return [];
    const base: ReportKpiCard[] = [
      {
        key: "rev",
        label: t.reports.kpiRevenue,
        value: formatFCFA(data.periodRevenue),
        icon: Wallet,
        color: "var(--color-primary)",
        bg: "rgba(31,58,95,0.08)",
        trendPct: pctChangeVsPrevious(data.periodRevenue, data.previousPeriodRevenue),
      },
      {
        key: "exp",
        label: t.reports.kpiExpenses,
        value: formatFCFA(data.periodExpenses),
        icon: Receipt,
        color: "var(--color-danger)",
        bg: "rgba(231,76,60,0.08)",
        trendPct: pctChangeVsPrevious(data.periodExpenses, data.previousPeriodExpenses),
        trendInverted: true,
      },
      {
        key: "profit",
        label: t.reports.kpiProfit,
        value: formatFCFA(data.periodProfit),
        icon: PiggyBank,
        color: "var(--color-success)",
        bg: "rgba(46,204,113,0.08)",
        trendPct: pctChangeVsPrevious(data.periodProfit, data.previousPeriodProfit),
      },
      {
        key: "txn",
        label: t.reports.kpiTransactions,
        value: String(data.periodSalesCount),
        icon: ShoppingCart,
        color: "var(--color-warning)",
        bg: "rgba(243,156,18,0.08)",
        trendPct: pctChangeVsPrevious(data.periodSalesCount, data.previousPeriodSalesCount),
      },
    ];
    if (canAdvancedReports && data.periodGrossMargin != null) {
      base.push({
        key: "gm",
        label: t.reports.kpiGrossMargin,
        value: formatFCFA(data.periodGrossMargin),
        icon: Percent,
        color: "var(--color-accent)",
        bg: "rgba(8,145,178,0.1)",
        trendPct: null,
      });
    }
    return base;
  }, [data, canAdvancedReports]);

  const pieData = paymentData.length
    ? paymentData
    : [{ name: t.reports.chartEmptyTitle, value: 100, color: "#ccc" }];

  const buildExportSnapshot = useCallback(() => {
    if (!data) return null;
    return buildReportExportSnapshot({
      data,
      periodRange: effectivePeriodRange,
      periodLabel: getReportPeriodLabel(activeTab, periodAnchors),
      business: {
        name: profile?.name ?? t.reports.exportProductBrand,
        address: profile?.address,
        phone: profile?.phone,
        logoUrl: profile?.logoUrl,
      },
      storeName: activeStore?.name,
      labels: {
        kpiRevenue: t.reports.kpiRevenue,
        kpiExpenses: t.reports.kpiExpenses,
        kpiProfit: t.reports.kpiProfit,
        kpiTransactions: t.reports.kpiTransactions,
        kpiGrossMargin: t.reports.kpiGrossMargin,
        productBrand: t.reports.exportProductBrand,
      },
      includeGrossMargin: canAdvancedReports && data.periodGrossMargin != null,
    });
  }, [
    data,
    effectivePeriodRange,
    activeTab,
    periodAnchors,
    profile,
    activeStore?.name,
    canAdvancedReports,
  ]);

  const handleExportPdf = useCallback(async () => {
    const snapshot = buildExportSnapshot();
    if (!snapshot) {
      message.warning(t.common.dataLoadingWait);
      return;
    }
    setExportPdfLoading(true);
    try {
      const { printReportA4 } = await import("@/utils/printReportA4");
      printReportA4(snapshot, {
        docTitle: t.reports.exportDocTitle,
        periodLabel: t.reports.exportPeriodLabel,
        generatedLabel: t.reports.exportGeneratedLabel,
        storeLabel: t.reports.exportStoreLabel,
        sectionKpis: t.reports.exportSectionKpis,
        sectionPayments: t.reports.exportSectionPayments,
        sectionMargin: t.reports.exportSectionMargin,
        sectionSales: t.reports.exportSectionSales,
        colMethod: t.reports.cashSummaryColMethod,
        colAmount: t.reports.cashSummaryColAmount,
        colPct: t.reports.cashSummaryColPct,
        colReceipt: t.reports.exportColReceipt,
        colDate: t.reports.exportColDate,
        colTime: t.reports.exportColTime,
        colTotal: t.reports.exportColTotal,
        colPayment: t.reports.exportColPayment,
        colStatus: t.reports.exportColStatus,
        colProduct: t.reports.columnProduct,
        colMargin: t.reports.columnEstimatedMargin,
        trendVsPrev: t.reports.exportTrendVsPrev,
        footerDisclaimer: t.reports.exportFooterDisclaimer,
        salesExcerptNote: t.reports.exportSalesExcerptNote,
        thankYou: t.reports.exportThankYou,
      });
      message.success(t.reports.exportPdfReady);
    } catch (e) {
      if (e instanceof Error && e.message === "PRINT_WINDOW_BLOCKED") {
        message.error(t.reports.exportPrintBlocked);
      } else {
        message.error(e instanceof Error ? e.message : t.reports.msgLoadError);
      }
    } finally {
      setExportPdfLoading(false);
    }
  }, [buildExportSnapshot]);

  const handleExportExcel = useCallback(async () => {
    const snapshot = buildExportSnapshot();
    if (!snapshot) {
      message.warning(t.common.dataLoadingWait);
      return;
    }
    setExportExcelLoading(true);
    try {
      const { downloadReportWorkbook } = await import("@/utils/buildReportWorkbook");
      await downloadReportWorkbook(snapshot, {
        sheetSummary: t.reports.exportSheetSummary,
        sheetPayments: t.reports.exportSheetPayments,
        sheetSales: t.reports.exportSheetSales,
        sheetMargin: t.reports.exportSheetMargin,
        headerBusiness: t.reports.exportHeaderBusiness,
        headerPeriod: t.reports.exportHeaderPeriod,
        headerGenerated: t.reports.exportHeaderGenerated,
        headerStore: t.reports.exportHeaderStore,
        colIndicator: t.reports.exportColIndicator,
        colValue: t.reports.exportColValue,
        colTrend: t.reports.exportColTrend,
        colMethod: t.reports.cashSummaryColMethod,
        colAmount: t.reports.cashSummaryColAmount,
        colPct: t.reports.cashSummaryColPct,
        colReceipt: t.reports.exportColReceipt,
        colDate: t.reports.exportColDate,
        colTime: t.reports.exportColTime,
        colTotal: t.reports.exportColTotal,
        colPayment: t.reports.exportColPayment,
        colStatus: t.reports.exportColStatus,
        colProduct: t.reports.columnProduct,
        colMargin: t.reports.columnEstimatedMargin,
        marginTotalLabel: t.reports.kpiGrossMargin,
        salesExcerptNote: t.reports.exportSalesExcerptNote,
        productBrand: t.reports.exportProductBrand,
      });
      message.success(t.reports.exportXlsxReady);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.reports.msgLoadError);
    } finally {
      setExportExcelLoading(false);
    }
  }, [buildExportSnapshot]);

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div className={styles.toolbar}>
          <Typography.Title level={4} className="pageTitle" style={{ margin: 0 }}>
            {t.reports.title}
          </Typography.Title>
          <Space wrap>
            <Button
              type="link"
              icon={<CircleHelp size={16} aria-hidden />}
              onClick={() => setGlossaryOpen(true)}
            >
              {t.reports.helpIndicatorsLink}
            </Button>
            {canExportPdf && (
              <Button
                icon={<FileDown size={16} />}
                loading={exportPdfLoading}
                onClick={() => void handleExportPdf()}
              >
                {t.reports.exportPdf}
              </Button>
            )}
            {canExportExcel && (
              <Button
                icon={<FileDown size={16} />}
                type="primary"
                loading={exportExcelLoading}
                onClick={() => void handleExportExcel()}
              >
                {t.reports.exportExcelAccountant}
              </Button>
            )}
          </Space>
        </div>
      </header>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
        items={[
          { key: "today", label: t.reports.today },
          { key: "week", label: t.reports.thisWeek },
          { key: "month", label: t.reports.thisMonth },
          { key: "customMonth", label: t.reports.pickMonth },
          ...(canAdvancedReports
            ? [
                { key: "quarter", label: t.reports.pickQuarter },
                { key: "year", label: t.reports.pickYear },
              ]
            : []),
        ]}
        className={styles.tabsWrap}
      />

      {activeTab === "customMonth" && (
        <div className={styles.monthPickerWrap}>
          <label htmlFor="reports-month" className={styles.monthPickerLabel}>
            {t.reports.monthPickerLabel}
          </label>
          <DatePicker
            id="reports-month"
            picker="month"
            value={selectedMonth}
            onChange={(d) => {
              if (d) setSelectedMonth(d);
            }}
            format="MMMM YYYY"
            allowClear={false}
            disabledDate={(current) => (current ? current.isAfter(dayjs().endOf("month")) : false)}
            className={styles.monthPicker}
          />
        </div>
      )}

      {activeTab === "quarter" && (
        <div className={styles.monthPickerWrap}>
          <label htmlFor="reports-quarter" className={styles.monthPickerLabel}>
            {t.reports.quarterPickerLabel}
          </label>
          <DatePicker
            id="reports-quarter"
            picker="quarter"
            value={selectedQuarter}
            onChange={(d) => {
              if (d) setSelectedQuarter(d);
            }}
            format="[T]Q YYYY"
            allowClear={false}
            disabledDate={(current) => (current ? isCalendarQuarterAfterCurrent(current) : false)}
            className={styles.monthPicker}
          />
        </div>
      )}

      {activeTab === "year" && (
        <div className={styles.monthPickerWrap}>
          <label htmlFor="reports-year" className={styles.monthPickerLabel}>
            {t.reports.yearPickerLabel}
          </label>
          <DatePicker
            id="reports-year"
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

      <Typography.Text type="secondary" className={styles.periodSummary}>
        {formatRangeSummaryFr(effectivePeriodRange.start, effectivePeriodRange.end)}
      </Typography.Text>

      {paymentAmountRows.length > 0 ? (
        <Card
          title={t.reports.cashSummaryTitle}
          variant="borderless"
          className={`${styles.cashSummaryCard} contentCard`}
        >
          <div className={styles.cashSummaryHead}>
            <span>{t.reports.cashSummaryColMethod}</span>
            <span>{t.reports.cashSummaryColAmount}</span>
            <span>{t.reports.cashSummaryColPct}</span>
          </div>
          <ul className={styles.cashSummaryList}>
            {paymentAmountRows.map((row) => (
              <li key={row.key} className={styles.cashSummaryRow}>
                <span>{row.label}</span>
                <span className={`amount ${styles.cashSummaryAmount}`}>
                  {formatFCFA(row.amount)}
                </span>
                <span className={styles.cashSummaryPct}>{row.pct}%</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* KPI summary row */}
      <Row gutter={[12, 12]} className={styles.kpiRow}>
        {kpiCards.map(({ key, label, value, icon: Icon, color, bg, trendPct, trendInverted }) => {
          const upGood = trendInverted
            ? trendPct !== null && trendPct <= 0
            : trendPct !== null && trendPct >= 0;
          return (
            <Col xs={12} sm={12} md={8} lg={6} key={key}>
              <Card variant="borderless" className={styles.kpiCard}>
                <div className={styles.kpiInner}>
                  <span className={styles.kpiIcon} style={{ background: bg, color }}>
                    <Icon size={18} />
                  </span>
                  <span className={styles.kpiValue}>{value}</span>
                  <span className={styles.kpiLabel}>{label}</span>
                  {trendPct !== null ? (
                    <Tag color={upGood ? "success" : "warning"} className={styles.kpiTrend}>
                      {trendPct > 0 ? (
                        <TrendingUp size={12} aria-hidden />
                      ) : trendPct < 0 ? (
                        <TrendingDown size={12} aria-hidden />
                      ) : null}
                      <span>
                        {trendPct > 0 ? "+" : ""}
                        {trendPct}%
                      </span>
                      <span className={styles.kpiTrendCaption}>{t.reports.vsPrevPeriodShort}</span>
                    </Tag>
                  ) : null}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div className={styles.charts}>
        <Card
          title={t.reports.salesVsExpenses}
          variant="borderless"
          className={`${styles.card} contentCard`}
        >
          <div className={styles.chartWrap}>
            {salesInPeriod.length === 0 ? (
              <EmptyState
                compact
                icon={BarChart3}
                title={t.reports.chartEmptyTitle}
                description={t.reports.chartEmptyDesc}
                action={
                  <Button type="primary" onClick={() => navigate("/pos")}>
                    {t.reports.chartEmptyCta}
                  </Button>
                }
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString("fr-FR")} F`} />
                  <Bar
                    dataKey="ventes"
                    fill="var(--color-primary)"
                    name="Ventes"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="dépenses"
                    fill="var(--color-danger)"
                    name="Dépenses"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card
          title={t.reports.paymentDistribution}
          variant="borderless"
          className={`${styles.card} contentCard`}
        >
          <div className={styles.chartWrap}>
            {salesInPeriod.length === 0 ? (
              <EmptyState
                compact
                icon={PieChartIcon}
                title={t.reports.chartEmptyTitle}
                description={t.reports.chartEmptyDesc}
                action={
                  <Button type="primary" onClick={() => navigate("/pos")}>
                    {t.reports.chartEmptyCta}
                  </Button>
                }
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} ${value}%`}
                  >
                    {pieData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        {canAdvancedReports && data != null && data.periodGrossMargin != null && (
          <Card
            title={t.reports.marginSectionTitle}
            variant="borderless"
            className={`${styles.card} contentCard ${styles.chartFullWidth}`}
          >
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {t.reports.marginSectionLead}
            </Typography.Paragraph>
            {data.topMarginProducts?.length ? (
              <Table
                size="small"
                pagination={false}
                dataSource={data.topMarginProducts.map((r) => ({
                  key: r.productId,
                  ...r,
                }))}
                columns={[
                  { title: t.reports.columnProduct, dataIndex: "productName" },
                  {
                    title: t.reports.columnEstimatedMargin,
                    dataIndex: "marginAmount",
                    align: "right",
                    render: (v: number) => formatFCFA(v),
                  },
                ]}
              />
            ) : (
              <EmptyState
                compact
                icon={ShoppingCart}
                title={t.reports.marginEmptyTitle}
                description={t.reports.marginEmptyDesc}
              />
            )}
          </Card>
        )}
        {salesInPeriod.length > 0 && (
          <Card
            title={t.reports.recentSalesTitle}
            variant="borderless"
            className={`${styles.card} contentCard`}
            style={{ marginTop: 16 }}
          >
            <div className="tableResponsive">
              <Table
                dataSource={salesInPeriod.map((s) => ({
                  key: s.saleId,
                  saleId: s.saleId,
                  receiptNumber: s.receiptNumber,
                  total: s.total,
                  paymentMethod: s.paymentMethod,
                  status: s.status ?? "completed",
                  createdAt: s.createdAt,
                }))}
                pagination={false}
                size="small"
                onRow={(r) => ({
                  style: { cursor: "pointer" },
                  onClick: () => navigate("/receipt", { state: { saleId: r.saleId } }),
                })}
                columns={[
                  {
                    title: t.sales.receiptNumber,
                    dataIndex: "receiptNumber",
                    width: 120,
                  },
                  {
                    title: t.reports.recentSalesColTime,
                    dataIndex: "createdAt",
                    width: 80,
                    render: (v: string) => formatTime(v),
                  },
                  {
                    title: t.reports.recentSalesColAmount,
                    dataIndex: "total",
                    width: 100,
                    align: "right",
                    render: (v: number) => (
                      <span className="amount">{v.toLocaleString("fr-FR")} F</span>
                    ),
                  },
                  {
                    title: t.reports.recentSalesColPayment,
                    dataIndex: "paymentMethod",
                    width: 100,
                    render: (m: string) => (
                      <Tag
                        color={
                          m === "wave"
                            ? "processing"
                            : m === "orange_money"
                              ? "warning"
                              : m === "credit"
                                ? "purple"
                                : "default"
                        }
                      >
                        {LABELS[m] || m}
                      </Tag>
                    ),
                  },
                  {
                    title: t.reports.exportColStatus,
                    dataIndex: "status",
                    width: 100,
                    render: (status: string) => (
                      <Tag color={status === "voided" ? "default" : "green"}>
                        {status === "voided" ? t.sales.statusVoided : t.sales.statusCompleted}
                      </Tag>
                    ),
                  },
                  ...(matrixCan("SALES_DELETE", "reports")
                    ? [
                        {
                          title: "",
                          key: "actions",
                          width: 120,
                          render: (_: unknown, r: { saleId: string; status: string }) =>
                            r.status === "completed" ? (
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<Ban size={14} />}
                                loading={voidingId === r.saleId}
                                onClick={(e) => handleVoidSale(r.saleId, e)}
                              >
                                {t.reports.recentSalesCancel}
                              </Button>
                            ) : null,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </Card>
        )}
      </div>

      <Drawer
        title={t.reports.glossaryTitle}
        placement="right"
        width={420}
        onClose={() => setGlossaryOpen(false)}
        open={glossaryOpen}
        footer={
          canAccess("expenses") ? (
            <Button
              type="primary"
              onClick={() => {
                setGlossaryOpen(false);
                navigate("/expenses");
              }}
            >
              {t.expenses.title}
            </Button>
          ) : null
        }
      >
        <Typography.Paragraph>{t.reports.glossaryP1}</Typography.Paragraph>
        <Typography.Paragraph>{t.reports.glossaryP2}</Typography.Paragraph>
        <Typography.Paragraph>{t.reports.glossaryP3}</Typography.Paragraph>
        <Typography.Paragraph>{t.reports.glossaryP4}</Typography.Paragraph>
        <Typography.Paragraph>{t.reports.glossaryP5}</Typography.Paragraph>
        <Typography.Paragraph>{t.reports.glossaryP6}</Typography.Paragraph>
        <Typography.Paragraph type="secondary">{t.reports.glossaryP7}</Typography.Paragraph>
      </Drawer>
    </div>
  );
}
