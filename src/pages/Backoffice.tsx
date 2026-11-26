import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Segmented, Table, Tooltip, message } from "antd";
import { Download, RefreshCw } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAdminRevenue,
  getAdminStats,
  getAdminSystemHealth,
  listAdminAuditLogs,
  listAdminPlans,
  type AdminPlanItem,
  type AdminRevenuePoint,
  type AdminStats,
  type AdminSystemHealth,
  type AuditLogEntry,
} from "@/api/backoffice";
import { labelFromChanges, resolveAuditNames, type AuditNameIndex } from "@/backoffice/auditLabels";
import { DateText } from "@/backoffice/components/DateText";
import { EmptyState } from "@/backoffice/components/EmptyState";
import { ErrorState } from "@/backoffice/components/ErrorState";
import { KpiCard } from "@/backoffice/components/KpiCard";
import { MoneyText } from "@/backoffice/components/MoneyText";
import { PlanBadge } from "@/backoffice/components/PlanBadge";
import { SkeletonKpi, SkeletonRows } from "@/backoffice/components/Skeleton";
import { Timeline } from "@/backoffice/components/Timeline";
import { formatDate } from "@/backoffice/format/date";
import { formatMoney } from "@/backoffice/format/money";
import { formatNumber } from "@/backoffice/format/number";
import { useBackofficeI18n } from "@/backoffice/useBackofficePreferences";
import { buildOverviewCsv, downloadCsv } from "@/utils/adminCsv";
import { periodDelta } from "@/utils/adminMoney";
import { parseAdminPeriodKey, resolveAdminPeriod } from "@/utils/adminPeriod";
import { formatAuditAction } from "@/utils/auditAction";
import styles from "./BackofficeOverview.module.css";

type OverviewPeriod = "7d" | "30d" | "90d" | "12m";

const PERIODS: OverviewPeriod[] = ["7d", "30d", "90d", "12m"];

function asOverviewPeriod(value: string | null): OverviewPeriod {
  const parsed = parseAdminPeriodKey(value, "30d");
  return PERIODS.includes(parsed as OverviewPeriod) ? (parsed as OverviewPeriod) : "30d";
}

function planColor(name: string): string {
  const key = name.toLowerCase();
  if (key.includes("business")) return "var(--plan-business)";
  if (key.includes("starter")) return "var(--plan-starter)";
  if (key.includes("pro")) return "var(--plan-pro)";
  return "var(--text-subtle)";
}

function hasCollections(points: AdminRevenuePoint[]): boolean {
  return points.some((point) => point.collected > 0 || point.outstanding > 0 || point.failed > 0);
}

export default function Backoffice() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useBackofficeI18n();
  const [period, setPeriod] = useState<OverviewPeriod>(
    asOverviewPeriod(searchParams.get("period"))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenue, setRevenue] = useState<AdminRevenuePoint[]>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [names, setNames] = useState<AuditNameIndex>({ users: {}, businesses: {} });
  const [catalog, setCatalog] = useState<AdminPlanItem[]>([]);
  const [planView, setPlanView] = useState<"plans" | "types">("plans");
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [rank, setRank] = useState<"gmv" | "subscription">("subscription");
  const hasStats = useRef(false);

  const range = useMemo(() => resolveAdminPeriod(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextStats, nextRevenue, nextActivity, nextHealth] = await Promise.all([
        getAdminStats({ from: range.from, to: range.to }),
        getAdminRevenue({ from: range.from, to: range.to }),
        listAdminAuditLogs({ page: 0, size: 8 }),
        getAdminSystemHealth().catch(() => null),
      ]);
      setStats(nextStats);
      hasStats.current = true;
      setRevenue(nextRevenue.points ?? []);
      const events = nextActivity.content ?? [];
      setActivity(events);
      setNames(await resolveAuditNames(events).catch(() => ({ users: {}, businesses: {} })));
      try {
        setCatalog(await listAdminPlans());
      } catch {
        setCatalog([]);
      }
      setHealth(nextHealth);
    } catch (caught) {
      if (hasStats.current) message.error(t.overview.refreshError);
      else setError(caught instanceof Error ? caught.message : t.overview.statsErrorHint);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, t.overview.refreshError, t.overview.statsErrorHint]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("period", period);
        next.delete("from");
        next.delete("to");
        return next;
      },
      { replace: true }
    );
  }, [period, setSearchParams]);

  const currency = stats?.currency ?? "XOF";
  const degradedCount =
    health?.services.filter((service) => service.status === "degraded" || service.status === "down")
      .length ?? 0;
  const actions = [
    {
      key: "demos",
      show: (stats?.pendingDemoRequestsCount ?? 0) > 0,
      label: t.overview.demos,
      count: stats?.pendingDemoRequestsCount ?? 0,
      href: "/backoffice/demo-requests?status=pending",
      tone: "warn" as const,
    },
    {
      key: "failed",
      show: (stats?.failedPaymentsCount ?? 0) > 0,
      label: t.overview.failedPayments,
      count: stats?.failedPaymentsCount ?? 0,
      href: "/backoffice/payments?status=failed",
      tone: "danger" as const,
    },
    {
      key: "health",
      show: degradedCount > 0,
      label: t.overview.degraded,
      count: degradedCount,
      href: "/backoffice/system",
      tone: "warn" as const,
    },
  ].filter((item) => item.show);

  const ranked = useMemo(() => {
    const rows = [...(stats?.topBusinesses ?? [])];
    rows.sort((left, right) =>
      rank === "gmv"
        ? right.revenue - left.revenue
        : (right.subscriptionAmount ?? 0) - (left.subscriptionAmount ?? 0)
    );
    return rows;
  }, [rank, stats?.topBusinesses]);

  const planRows = useMemo(() => {
    const distribution = stats?.planDistribution ?? [];
    const known = new Map(distribution.map((entry) => [entry.plan.toLowerCase(), entry]));
    const namesInCatalog = catalog
      .map((plan) => plan.name)
      .filter((name) => name.trim().length > 0);
    const ordered = [...namesInCatalog];
    for (const entry of distribution) {
      if (!ordered.some((name) => name.toLowerCase() === entry.plan.toLowerCase())) {
        ordered.push(entry.plan);
      }
    }
    if (ordered.length === 0) return distribution;
    return ordered.map((name) => known.get(name.toLowerCase()) ?? { plan: name, count: 0, pct: 0 });
  }, [catalog, stats?.planDistribution]);

  const chartPoints = revenue.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));

  if (loading && !stats) {
    return (
      <div className={styles.page}>
        <div className={styles.kpis}>
          {[0, 1, 2, 3, 4].map((item) => (
            <SkeletonKpi key={item} />
          ))}
        </div>
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (!stats) {
    return (
      <ErrorState
        title={t.overview.statsError}
        description={error ?? t.overview.statsErrorHint}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.overview.title}</h1>
          <p className={styles.lede}>{t.overview.lede}</p>
        </div>
        <div className={styles.tools}>
          {stats.generatedAt ? (
            <span className={styles.updated}>
              {t.overview.updated} <DateText value={stats.generatedAt} mode="datetime" />
            </span>
          ) : null}
          <Segmented
            value={period}
            onChange={(value) => setPeriod(value as OverviewPeriod)}
            options={[
              { label: t.overview.period7, value: "7d" },
              { label: t.overview.period30, value: "30d" },
              { label: t.overview.period90, value: "90d" },
              { label: t.overview.period12, value: "12m" },
            ]}
          />
          <Button
            icon={<RefreshCw size={16} strokeWidth={1.75} aria-hidden />}
            onClick={() => void load()}
          >
            {t.overview.refresh}
          </Button>
          <Button
            icon={<Download size={16} strokeWidth={1.75} aria-hidden />}
            onClick={() =>
              downloadCsv(
                `ecom360-vue-ensemble-${range.from.slice(0, 10)}.csv`,
                buildOverviewCsv(stats)
              )
            }
          >
            {t.overview.export}
          </Button>
        </div>
      </header>

      <section aria-label={t.overview.actions}>
        <h2 className={styles.sectionTitle}>{t.overview.actions}</h2>
        {actions.length === 0 ? (
          <EmptyState title={t.overview.actionsEmpty} />
        ) : (
          <div className={styles.actions}>
            {actions.map((item) => (
              <button
                key={item.key}
                type="button"
                className={styles.action}
                onClick={() => navigate(item.href)}
              >
                <span className={styles.actionLabel}>{item.label}</span>
                <span className={`${styles.actionCount} ${styles[item.tone]}`}>
                  {formatNumber(item.count)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={styles.kpis}>
        <KpiCard
          label={t.overview.mrr}
          numericValue={stats.mrr ?? 0}
          formatValue={(value) => formatMoney(value, currency)}
          hint={t.overview.mrrHint}
        />
        <KpiCard
          label={t.overview.activeBusinesses}
          numericValue={stats.activeBusinessesCount ?? null}
          formatValue={(value) => formatNumber(value)}
          hint={t.overview.activeHint}
        />
        <KpiCard
          label={t.overview.signups}
          value={t.overview.unavailable}
          hint={t.overview.signupsHint}
        />
        <KpiCard
          label={t.overview.churn}
          value={t.overview.unavailable}
          hint={t.overview.churnHint}
        />
        <KpiCard
          label={t.overview.gmv}
          numericValue={stats.monthlyRevenue}
          formatValue={(value) => formatMoney(value, currency)}
          delta={periodDelta(stats.monthlyRevenue, stats.previousPeriodMerchantRevenue)}
          hint={t.overview.gmvHint}
          caption={t.overview.gmvCaption}
        />
      </section>

      <section className={styles.split}>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>{t.overview.collections}</h2>
            <Tooltip title={t.overview.collectionsHint}>
              <span style={{ color: "var(--text-subtle)", fontSize: 12 }}>
                {t.overview.collected}
              </span>
            </Tooltip>
          </div>
          {hasCollections(revenue) ? (
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value: number) => formatNumber(value)}
                  />
                  <ChartTooltip
                    formatter={(value) =>
                      formatMoney(typeof value === "number" ? value : Number(value), currency)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name={t.overview.collected}
                    stroke="var(--ink-900)"
                    fill="var(--info-50)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outstanding"
                    name={t.overview.outstanding}
                    stroke="var(--warning)"
                    fill="var(--warning-50)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name={t.overview.failed}
                    stroke="var(--danger)"
                    fill="var(--danger-50)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title={t.overview.collectionsEmpty} />
          )}
        </article>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>{t.overview.plans}</h2>
            <Segmented
              size="small"
              value={planView}
              onChange={(value) => setPlanView(value as "plans" | "types")}
              options={[
                { label: t.overview.plansTab, value: "plans" },
                { label: t.overview.typesTab, value: "types" },
              ]}
            />
          </div>
          {planView === "types" ? (
            <EmptyState title={t.overview.unavailable} description={t.overview.typesUnavailable} />
          ) : planRows.length === 0 ? (
            <EmptyState title={t.overview.plansEmpty} />
          ) : (
            <>
              <div className={styles.chart}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planRows}
                      dataKey="count"
                      nameKey="plan"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={2}
                    >
                      {planRows.map((entry) => (
                        <Cell key={entry.plan} fill={planColor(entry.plan)} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.legend}>
                {planRows.map((entry) => (
                  <button
                    key={entry.plan}
                    type="button"
                    onClick={() =>
                      navigate(`/backoffice/businesses?plan=${encodeURIComponent(entry.plan)}`)
                    }
                  >
                    <span className={styles.swatch} style={{ background: planColor(entry.plan) }} />
                    <PlanBadge name={entry.plan} slug={entry.plan} />
                    <span>
                      {t.overview.planCount.replace("{count}", formatNumber(entry.count))} ·{" "}
                      {formatNumber(entry.pct)} %
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <section className={styles.split}>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>{t.overview.activity}</h2>
            <Button type="link" onClick={() => navigate("/backoffice/audit")}>
              {t.overview.journal}
            </Button>
          </div>
          {activity.length === 0 ? (
            <EmptyState title={t.overview.activityEmpty} />
          ) : (
            <Timeline
              items={activity.map((item) => ({
                id: item.id,
                actor: item.userId
                  ? (names.users[item.userId] ?? t.overview.accountActor)
                  : t.overview.systemActor,
                action: formatAuditAction(item.action),
                target:
                  labelFromChanges(item.changes) ??
                  (item.businessId ? names.businesses[item.businessId] : null) ??
                  item.entityType ??
                  null,
                at: item.createdAt,
                onSelect: () =>
                  navigate(
                    `/backoffice/audit?requestId=${encodeURIComponent(item.requestId ?? item.id)}`
                  ),
              }))}
            />
          )}
        </article>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>{t.overview.top}</h2>
            <Button type="link" onClick={() => navigate("/backoffice/businesses")}>
              {t.overview.seeAll}
            </Button>
          </div>
          <Tooltip title={t.overview.rankHint}>
            <Segmented
              value={rank}
              onChange={(value) => setRank(value as "gmv" | "subscription")}
              options={[
                { label: t.overview.rankSubscription, value: "subscription" },
                { label: t.overview.rankGmv, value: "gmv" },
              ]}
            />
          </Tooltip>
          <Table
            style={{ marginTop: 12 }}
            size="small"
            pagination={false}
            rowKey={(row) => row.id ?? row.name}
            dataSource={ranked}
            locale={{ emptyText: t.overview.topEmpty }}
            onRow={(row) => ({
              onClick: () =>
                navigate(
                  row.id ? `/backoffice/businesses?highlight=${row.id}` : "/backoffice/businesses"
                ),
              style: { cursor: "pointer" },
            })}
            columns={[
              { title: t.overview.business, dataIndex: "name", key: "name" },
              {
                title: t.overview.plan,
                dataIndex: "plan",
                key: "plan",
                render: (plan: string) => <PlanBadge name={plan} slug={plan} />,
              },
              {
                title: t.overview.subscription,
                key: "subscription",
                align: "right",
                render: (_value, row) => (
                  <MoneyText value={row.subscriptionAmount ?? 0} currency={currency} />
                ),
              },
              {
                title: t.overview.gmvColumn,
                key: "gmv",
                align: "right",
                render: (_value, row) => <MoneyText value={row.revenue} currency={currency} />,
              },
            ]}
          />
        </article>
      </section>
    </div>
  );
}
