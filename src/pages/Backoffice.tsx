import { useState, useEffect, useCallback } from "react";
import { Card, Typography, Row, Col, Tag, Skeleton, Button, message } from "antd";
import {
  Building2,
  Users,
  TrendingUp,
  Activity,
  UserPlus,
  Store,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAdminStats } from "@/api/backoffice";
import styles from "./Backoffice.module.css";

const planColors: Record<string, string> = {
  Starter: "var(--color-text-muted)",
  Pro: "var(--color-primary)",
  Business: "var(--color-warning)",
};

function formatFCFA(n: number): string {
  return `${n.toLocaleString("fr-FR")} F`;
}

const recentActivity = [
  {
    id: "1",
    icon: UserPlus,
    color: "var(--color-primary)",
    title: "Nouvel utilisateur",
    desc: "Inscription récente",
    time: "—",
  },
  {
    id: "2",
    icon: Building2,
    color: "var(--color-accent)",
    title: "Nouvelle entreprise",
    desc: "Création récente",
    time: "—",
  },
  {
    id: "3",
    icon: AlertTriangle,
    color: "var(--color-warning)",
    title: "Abonnement",
    desc: "Voir les entreprises",
    time: "—",
  },
  {
    id: "4",
    icon: CheckCircle,
    color: "var(--color-success)",
    title: "Paiement",
    desc: "Voir les entreprises",
    time: "—",
  },
  {
    id: "5",
    icon: Store,
    color: "var(--color-text-muted)",
    title: "Boutique",
    desc: "Voir les entreprises",
    time: "—",
  },
];

export default function Backoffice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement statistiques");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const kpis = stats
    ? [
        {
          key: "businesses",
          label: "Entreprises",
          value: String(stats.businessesCount),
          icon: Building2,
          color: "var(--color-primary)",
          path: "/backoffice/businesses",
        },
        {
          key: "users",
          label: "Utilisateurs",
          value: String(stats.usersCount),
          icon: Users,
          color: "var(--color-accent)",
          path: "/backoffice/users",
        },
        {
          key: "revenue",
          label: "Revenu mensuel",
          value: formatFCFA(stats.monthlyRevenue),
          icon: CreditCard,
          color: "var(--color-success)",
          path: "/backoffice/businesses",
        },
        {
          key: "stores",
          label: "Boutiques actives",
          value: String(stats.storesCount),
          icon: Store,
          color: "var(--color-warning)",
          path: "/backoffice/businesses",
        },
      ]
    : [];

  if (loading || !stats) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.pageHeader}>
          <Skeleton.Input active style={{ width: 240, height: 28 }} />
          <Skeleton.Input active style={{ width: 180, height: 18, marginTop: 8 }} />
        </div>
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={12} sm={6} key={i}>
              <Card bordered={false} className={styles.kpiCard}>
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <Typography.Title level={4} className={styles.pageTitle}>
            Vue d'ensemble
          </Typography.Title>
          <Typography.Text type="secondary" className={styles.pageSubtitle}>
            Tableau de bord de la plateforme —{" "}
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Typography.Text>
        </div>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className={styles.kpiSection}>
        {kpis.map(({ key, label, value, icon: Icon, color, path }) => (
          <Col xs={12} sm={12} md={6} key={key}>
            <Card
              bordered={false}
              className={styles.kpiCard}
              hoverable
              onClick={() => navigate(path)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.kpiTop}>
                <span className={styles.kpiIconWrap} style={{ background: `${color}12`, color }}>
                  <Icon size={18} />
                </span>
              </div>
              <div className={styles.kpiValue}>{value}</div>
              <div className={styles.kpiLabel}>{label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main content grid */}
      <Row gutter={[16, 16]} className={styles.mainGrid}>
        {/* Activity feed */}
        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            className={styles.card}
            title={
              <span className={styles.cardTitle}>
                <Activity size={18} />
                Activité récente
              </span>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate("/backoffice/system")}>
                Voir tout
              </Button>
            }
          >
            <div className={styles.activityList}>
              {recentActivity.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className={styles.activityRow}>
                    <span
                      className={styles.activityIcon}
                      style={{ background: `${item.color}10`, color: item.color }}
                    >
                      <Icon size={16} />
                    </span>
                    <div className={styles.activityContent}>
                      <span className={styles.activityTitle}>{item.title}</span>
                      <span className={styles.activityDesc}>{item.desc}</span>
                    </div>
                    <span className={styles.activityTime}>
                      <Clock size={12} />
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* Right column */}
        <Col xs={24} lg={10}>
          {/* Plan distribution */}
          <Card
            bordered={false}
            className={styles.card}
            title={
              <span className={styles.cardTitle}>
                <TrendingUp size={18} />
                Répartition des plans
              </span>
            }
            style={{ marginBottom: 16 }}
          >
            <div className={styles.planList}>
              {stats.planDistribution.map(({ plan, count, pct }) => (
                <div key={plan} className={styles.planRow}>
                  <div className={styles.planMeta}>
                    <span className={styles.planName}>{plan}</span>
                    <span className={styles.planCount}>{count} entreprises</span>
                    <span className={styles.planPct}>{pct}%</span>
                  </div>
                  <div className={styles.planBar}>
                    <div
                      className={styles.planBarFill}
                      style={{
                        width: `${pct}%`,
                        background: planColors[plan] ?? "var(--color-text-muted)",
                      }}
                    />
                  </div>
                </div>
              ))}
              {stats.planDistribution.length === 0 && (
                <Typography.Text type="secondary">Aucune donnée</Typography.Text>
              )}
            </div>
          </Card>

          {/* Top businesses */}
          <Card
            bordered={false}
            className={styles.card}
            title={
              <span className={styles.cardTitle}>
                <Building2 size={18} />
                Top entreprises
              </span>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate("/backoffice/businesses")}>
                Voir tout
              </Button>
            }
          >
            <div className={styles.topList}>
              {stats.topBusinesses.map((biz, i) => (
                <div
                  key={`${biz.name}-${i}`}
                  className={styles.topRow}
                  onClick={() => navigate("/backoffice/businesses")}
                >
                  <span className={styles.topRank}>#{i + 1}</span>
                  <div className={styles.topInfo}>
                    <span className={styles.topName}>{biz.name}</span>
                    <span className={styles.topOwner}>
                      {biz.owner} · {biz.storesCount} boutique{biz.storesCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className={styles.topRight}>
                    <span className={styles.topRevenue}>{formatFCFA(biz.revenue)}</span>
                    <Tag
                      style={{ margin: 0, fontSize: 10 }}
                      color={
                        biz.plan === "Business" ? "gold" : biz.plan === "Pro" ? "blue" : "default"
                      }
                    >
                      {biz.plan}
                    </Tag>
                  </div>
                  <ChevronRight size={14} className={styles.topChevron} />
                </div>
              ))}
              {stats.topBusinesses.length === 0 && (
                <Typography.Text type="secondary">Aucune entreprise</Typography.Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
