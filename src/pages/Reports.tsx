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
import {
  formatRangeSummaryFr,
  isYmdInInclusiveRange,
  rangeFullCalendarMonth,
  rangeRollingWeekWithinCurrentMonth,
  rangeTodayLocal,
  toLocalYmd,
} from "@/utils/dateLocal";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/EmptyState";
import { pctChangeVsPrevious } from "@/utils/kpiDelta";

type TabKey = "today" | "week" | "month" | "customMonth";

type ChartPoint = { name: string; ventes: number; dépenses: number };

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

const LABELS: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  credit: "Crédit",
};

function escapeCsvCell(v: string | number): string {
  const s = String(v);
  if (s.includes(";") || s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatMonthYearFr(d: Dayjs): string {
  return new Date(d.year(), d.month(), 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function exportToCsv(
  data: Awaited<ReturnType<typeof getDashboard>>,
  tab: TabKey,
  selectedMonth: Dayjs,
  periodRange: { start: string; end: string }
) {
  const periodLabel =
    tab === "today"
      ? "Aujourd'hui"
      : tab === "week"
        ? "Cette semaine"
        : tab === "month"
          ? "Ce mois"
          : formatMonthYearFr(selectedMonth);
  const rows: string[] = [
    "Rapport 360 PME Commerce",
    `Période;${periodLabel}`,
    "",
    "Résumé;Ventes;Dépenses;Bénéfice;Transactions",
    `;${data.periodRevenue};${data.periodExpenses};${data.periodProfit};${data.periodSalesCount}`,
    "",
    "Ventes récentes",
    "N° ticket;Date;Heure;Montant (F);Paiement",
  ];
  const salesFiltered = data.recentSales.filter((s) =>
    isYmdInInclusiveRange(s.createdAt.slice(0, 10), periodRange.start, periodRange.end)
  );
  for (const s of salesFiltered) {
    const date = s.createdAt.slice(0, 10);
    const time = formatTime(s.createdAt);
    const method = LABELS[s.paymentMethod] || s.paymentMethod;
    rows.push(
      `${escapeCsvCell(s.receiptNumber)};${date};${time};${s.total};${escapeCsvCell(method)}`
    );
  }
  const csv = rows.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function getPeriodRange(tab: TabKey, selectedMonth: Dayjs): { start: string; end: string } {
  const now = new Date();
  if (tab === "today") return rangeTodayLocal();
  if (tab === "week") return rangeRollingWeekWithinCurrentMonth();
  if (tab === "customMonth") {
    return rangeFullCalendarMonth(selectedMonth.year(), selectedMonth.month());
  }
  return {
    start: toLocalYmd(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toLocalYmd(now),
  };
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
  const { canExportPdf, canExportExcel } = usePlanFeatures();
  const { canAccess } = usePermissions();
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("week");
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(() => dayjs());
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const dashboardFetchIdRef = useRef(0);

  const periodRange = useMemo(
    () => getPeriodRange(activeTab, selectedMonth),
    [activeTab, selectedMonth]
  );

  const loadData = useCallback(() => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    const { start, end } = getPeriodRange(activeTab, selectedMonth);
    const fetchId = ++dashboardFetchIdRef.current;
    setLoading(true);
    getDashboard({ periodStart: start, periodEnd: end })
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
  }, [activeTab, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVoidSale = useCallback(
    (saleId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!matrixCan("SALES_DELETE", "reports")) return;
      Modal.confirm({
        title: "Annuler la vente",
        content:
          "La vente sera annulée : le stock sera recrédité et le montant crédit client (si applicable) sera déduit. Cette action est irréversible.",
        okText: "Annuler la vente",
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
    const { start, end } = periodRange;
    return data.recentSales.filter((s) =>
      isYmdInInclusiveRange(s.createdAt.slice(0, 10), start, end)
    );
  }, [data, periodRange.start, periodRange.end]);

  const chartData = useMemo((): ChartPoint[] => {
    if (!salesInPeriod.length) return [];
    const byPeriod: Record<string, { ventes: number; dépenses: number }> = {};
    for (const s of salesInPeriod) {
      const key = s.createdAt.slice(0, 10);
      if (!byPeriod[key]) byPeriod[key] = { ventes: 0, dépenses: 0 };
      byPeriod[key].ventes += s.total;
    }
    return Object.entries(byPeriod)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, v]) => ({ name: name.slice(5) || name, ...v }));
  }, [salesInPeriod]);

  const paymentData = useMemo(() => {
    if (!salesInPeriod.length) return [];
    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const s of salesInPeriod) {
      const m = s.paymentMethod || "cash";
      byMethod[m] = (byMethod[m] || 0) + s.total;
      total += s.total;
    }
    if (total === 0) return [];
    return Object.entries(byMethod).map(([method, amount]) => ({
      name: LABELS[method] || method,
      value: Math.round((amount / total) * 100),
      color: PAYMENT_COLORS[method] || "var(--color-primary)",
    }));
  }, [salesInPeriod]);

  const paymentAmountRows = useMemo(() => {
    if (!salesInPeriod.length) return [];
    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const s of salesInPeriod) {
      const m = s.paymentMethod || "cash";
      byMethod[m] = (byMethod[m] || 0) + s.total;
      total += s.total;
    }
    if (total === 0) return [];
    return Object.entries(byMethod)
      .map(([method, amount]) => ({
        key: method,
        label: LABELS[method] || method,
        amount,
        pct: Math.round((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [salesInPeriod]);

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
    if (data.periodGrossMargin != null) {
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
  }, [data]);

  const pieData = paymentData.length
    ? paymentData
    : [{ name: "Aucune donnée", value: 100, color: "#ccc" }];

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
              <Button icon={<FileDown size={16} />} onClick={() => window.print()}>
                {t.reports.exportPdf}
              </Button>
            )}
            {canExportExcel && (
              <Button
                icon={<FileDown size={16} />}
                type="primary"
                onClick={() => {
                  if (data) {
                    exportToCsv(data, activeTab, selectedMonth, periodRange);
                    message.success(t.reports.exportCsvReady);
                  } else {
                    message.warning(t.common.dataLoadingWait);
                  }
                }}
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

      <Typography.Text type="secondary" className={styles.periodSummary}>
        {formatRangeSummaryFr(periodRange.start, periodRange.end)}
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
        {data != null && data.periodGrossMargin != null && (
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
            title="Ventes récentes"
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
                    title: "N° ticket",
                    dataIndex: "receiptNumber",
                    width: 120,
                  },
                  {
                    title: "Heure",
                    dataIndex: "createdAt",
                    width: 80,
                    render: (v: string) => formatTime(v),
                  },
                  {
                    title: "Montant",
                    dataIndex: "total",
                    width: 100,
                    align: "right",
                    render: (v: number) => (
                      <span className="amount">{v.toLocaleString("fr-FR")} F</span>
                    ),
                  },
                  {
                    title: "Paiement",
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
                    title: "Statut",
                    dataIndex: "status",
                    width: 100,
                    render: (status: string) => (
                      <Tag color={status === "voided" ? "default" : "green"}>
                        {status === "voided" ? "Annulée" : "Terminée"}
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
                                Annuler
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
