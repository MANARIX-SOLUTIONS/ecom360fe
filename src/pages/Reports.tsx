import { useState, useMemo, useEffect } from "react";
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
} from "antd";
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
import { FileDown, Wallet, Receipt, PiggyBank, ShoppingCart } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Reports.module.css";
import { getDashboard } from "@/api";

type TabKey = "today" | "week" | "month";

type ChartPoint = { name: string; ventes: number; dépenses: number };

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

function exportToCsv(data: Awaited<ReturnType<typeof getDashboard>>, tab: TabKey) {
  const periodLabel =
    tab === "today" ? "Aujourd'hui" : tab === "week" ? "Cette semaine" : "Ce mois";
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
  for (const s of data.recentSales) {
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

function getPeriodRange(tab: TabKey): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (tab === "today") return { start: today, end: today };
  if (tab === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { start: d.toISOString().slice(0, 10), end: today };
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: d.toISOString().slice(0, 10), end: today };
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
  const [activeTab, setActiveTab] = useState<TabKey>("week");
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    const { start, end } = getPeriodRange(activeTab);
    getDashboard({ periodStart: start, periodEnd: end })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const chartData = useMemo((): ChartPoint[] => {
    if (!data?.recentSales.length) return [];
    const byPeriod: Record<string, { ventes: number; dépenses: number }> = {};
    for (const s of data.recentSales) {
      const key = s.createdAt.slice(0, 10);
      if (!byPeriod[key]) byPeriod[key] = { ventes: 0, dépenses: 0 };
      byPeriod[key].ventes += s.total;
    }
    return Object.entries(byPeriod)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, v]) => ({ name: name.slice(5) || name, ...v }));
  }, [data]);

  const paymentData = useMemo(() => {
    if (!data?.recentSales.length) return [];
    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const s of data.recentSales) {
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
  }, [data]);

  const kpis = useMemo(() => {
    if (!data) return { sales: "0 F", expenses: "0 F", profit: "0 F", txn: "0" };
    return {
      sales: formatFCFA(data.periodRevenue),
      expenses: formatFCFA(data.periodExpenses),
      profit: formatFCFA(data.periodProfit),
      txn: String(data.periodSalesCount),
    };
  }, [data]);

  const pieData = paymentData.length
    ? paymentData
    : [{ name: "Aucune donnée", value: 100, color: "#ccc" }];

  const kpiCards = [
    {
      label: "Ventes",
      value: kpis.sales,
      icon: Wallet,
      color: "var(--color-primary)",
      bg: "rgba(31,58,95,0.08)",
    },
    {
      label: "Dépenses",
      value: kpis.expenses,
      icon: Receipt,
      color: "var(--color-danger)",
      bg: "rgba(231,76,60,0.08)",
    },
    {
      label: "Bénéfice",
      value: kpis.profit,
      icon: PiggyBank,
      color: "var(--color-success)",
      bg: "rgba(46,204,113,0.08)",
    },
    {
      label: "Transactions",
      value: kpis.txn,
      icon: ShoppingCart,
      color: "var(--color-warning)",
      bg: "rgba(243,156,18,0.08)",
    },
  ];

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div className={styles.toolbar}>
          <Typography.Title level={4} className="pageTitle" style={{ margin: 0 }}>
            Rapports
          </Typography.Title>
          <Space wrap>
            <Button icon={<FileDown size={16} />} onClick={() => window.print()}>
              {t.reports.exportPdf}
            </Button>
            <Button
              icon={<FileDown size={16} />}
              onClick={() => {
                if (data) {
                  exportToCsv(data, activeTab);
                  message.success("Export téléchargé (CSV)");
                } else {
                  message.warning("Chargement des données en cours…");
                }
              }}
            >
              {t.reports.exportExcel}
            </Button>
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
        ]}
        className={styles.tabsWrap}
      />

      {/* KPI summary row */}
      <Row gutter={[12, 12]} className={styles.kpiRow}>
        {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Col xs={12} sm={6} key={label}>
            <Card bordered={false} className={styles.kpiCard}>
              <div className={styles.kpiInner}>
                <span className={styles.kpiIcon} style={{ background: bg, color }}>
                  <Icon size={18} />
                </span>
                <span className={styles.kpiValue}>{value}</span>
                <span className={styles.kpiLabel}>{label}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div className={styles.charts}>
        <Card
          title={t.reports.salesVsExpenses}
          bordered={false}
          className={`${styles.card} contentCard`}
        >
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData.length ? chartData : [{ name: "-", ventes: 0, dépenses: 0 }]}
              >
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
          </div>
        </Card>
        <Card
          title={t.reports.paymentDistribution}
          bordered={false}
          className={`${styles.card} contentCard`}
        >
          <div className={styles.chartWrap}>
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
          </div>
        </Card>
        {data?.recentSales && data.recentSales.length > 0 && (
          <Card
            title="Ventes récentes"
            bordered={false}
            className={`${styles.card} contentCard`}
            style={{ marginTop: 16 }}
          >
            <div className="tableResponsive">
              <Table
                dataSource={data.recentSales.map((s) => ({
                  key: s.saleId,
                  saleId: s.saleId,
                  receiptNumber: s.receiptNumber,
                  total: s.total,
                  paymentMethod: s.paymentMethod,
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
                ]}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
