import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Col, Row, Segmented, Skeleton, Table, Typography } from "antd";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CreditCard, Download, RefreshCw, Wallet } from "lucide-react";
import {
  getAdminRevenue,
  getAdminStats,
  type AdminRevenuePoint,
  type AdminStats,
} from "@/api/backoffice";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { KpiCard } from "@/components/backoffice/KpiCard";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import {
  failedPaymentRate,
  formatAdminMoney,
  formatAdminRate,
  periodDelta,
} from "@/utils/adminMoney";
import { parseAdminPeriodKey, resolveAdminPeriod, type AdminPeriodKey } from "@/utils/adminPeriod";
import { buildRevenueCsv, downloadCsv } from "@/utils/adminCsv";
import styles from "./Backoffice.module.css";

export default function BackofficeRevenue() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriod] = useState<AdminPeriodKey>(
    parseAdminPeriodKey(searchParams.get("period"), "30d")
  );
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [points, setPoints] = useState<AdminRevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const range = useMemo(() => resolveAdminPeriod(period === "custom" ? "30d" : period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const [nextStats, series] = await Promise.all([
        getAdminStats({ from: range.from, to: range.to }),
        getAdminRevenue({ from: range.from, to: range.to }),
      ]);
      setStats(nextStats);
      setPoints(series.points ?? []);
    } catch {
      setHasError(true);
      setStats(null);
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("period", period);
        return next;
      },
      { replace: true }
    );
  }, [period, setSearchParams]);

  const currency = stats?.currency ?? "XOF";
  const failureRate = failedPaymentRate(stats?.failedPaymentsCount, stats?.paymentAttemptsCount);

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Analytique revenus"
        subtitle="MRR et encaissements d'abonnement uniquement. Le CA POS des marchands est affiché séparément."
        extra={
          <>
            <Segmented
              value={period}
              onChange={(value) => setPeriod(value as AdminPeriodKey)}
              options={[
                { label: "7 j", value: "7d" },
                { label: "30 j", value: "30d" },
                { label: "90 j", value: "90d" },
              ]}
            />
            <Button icon={<RefreshCw size={16} />} onClick={() => void load()}>
              Actualiser
            </Button>
            <Button
              icon={<Download size={16} />}
              disabled={points.length === 0}
              onClick={() =>
                downloadCsv(`revenus-${range.from.slice(0, 10)}.csv`, buildRevenueCsv(points))
              }
            >
              Export CSV
            </Button>
          </>
        }
      />
      {hasError ? (
        <ErrorState
          title="Analytique indisponible"
          description="Les agrégats de revenus n'ont pas pu être chargés."
          onRetry={() => void load()}
        />
      ) : (
        <>
          <Row gutter={[16, 16]} className={styles.kpiSection}>
            <Col xs={24} md={12} xl={6}>
              <KpiCard
                label="MRR"
                value={loading ? "…" : formatAdminMoney(stats?.mrr ?? 0, currency)}
                hint="Somme normalisée des abonnements actifs, hors essais. Les plans annuels sont divisés par 12."
                icon={Wallet}
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <KpiCard
                label="Encaissé"
                value={loading ? "…" : formatAdminMoney(stats?.saasCollected ?? 0, currency)}
                hint="Paiements confirmés pendant la période."
                icon={CreditCard}
                delta={periodDelta(stats?.saasCollected, stats?.previousPeriodCollected)}
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <KpiCard
                label="En attente"
                value={loading ? "…" : formatAdminMoney(stats?.saasOutstanding ?? 0, currency)}
                hint="Intents encore pending créés pendant la période. Ce n'est pas une créance certaine."
                icon={CreditCard}
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <KpiCard
                label="Taux d'échec"
                value={loading ? "…" : formatAdminRate(failureRate)}
                hint="Intents échoués / intents créés sur la période. Affiché uniquement si des tentatives existent."
                icon={CreditCard}
                footnote={
                  failureRate == null
                    ? "Non disponible"
                    : `${stats?.failedPaymentsCount ?? 0} échec${(stats?.failedPaymentsCount ?? 0) > 1 ? "s" : ""} · ${formatAdminMoney(stats?.failedPaymentsAmount ?? 0, currency)}`
                }
              />
            </Col>
          </Row>
          <Card
            variant="borderless"
            className={styles.card}
            title="Encaissé vs en attente vs échoué"
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : points.length === 0 ? (
              <EmptyState compact icon={CreditCard} title="Aucun paiement pour cette période" />
            ) : (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatAdminMoney(value, currency)} />
                    <Area
                      dataKey="collected"
                      name="Encaissé"
                      stroke="#183153"
                      fill="rgba(24,49,83,0.12)"
                    />
                    <Area
                      dataKey="outstanding"
                      name="En attente"
                      stroke="#429BD1"
                      fill="rgba(66,155,209,0.12)"
                    />
                    <Area
                      dataKey="failed"
                      name="Échoué"
                      stroke="#dc2626"
                      fill="rgba(220,38,38,0.08)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card
            variant="borderless"
            className={styles.card}
            style={{ marginTop: 16 }}
            title="Répartition par plan"
          >
            <Table
              rowKey="plan"
              loading={loading}
              pagination={false}
              dataSource={stats?.planDistribution ?? []}
              locale={{ emptyText: "Aucune répartition disponible" }}
              onRow={(row) => ({
                onClick: () =>
                  navigate(`/backoffice/businesses?plan=${encodeURIComponent(row.plan)}`),
                style: { cursor: "pointer" },
              })}
              columns={[
                { title: "Plan", dataIndex: "plan" },
                { title: "Entreprises", dataIndex: "count" },
                { title: "Part", dataIndex: "pct", render: (value: number) => `${value} %` },
              ]}
            />
            <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
              Le renouvellement, le churn et la conversion essai → payant ne sont affichés que
              lorsqu'ils sont suivis par le backend. Ils ne sont pas estimés ici.
            </Typography.Paragraph>
          </Card>
        </>
      )}
    </div>
  );
}
