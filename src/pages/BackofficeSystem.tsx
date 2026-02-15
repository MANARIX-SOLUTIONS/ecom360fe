import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Tag,
  Button,
  Switch,
  Skeleton,
  message,
  Modal,
} from "antd";
import {
  Server,
  Database,
  Globe,
  Clock,
  HardDrive,
  Cpu,
  Activity,
  Shield,
  RefreshCw,
  Download,
  Zap,
  Bell,
  Smartphone,
  BarChart3,
} from "lucide-react";
import styles from "./Backoffice.module.css";

const healthItems = (apiStatus: string | null, apiOk: boolean) => [
  {
    icon: Server,
    label: "API",
    value: apiStatus ?? "—",
    status: apiOk ? "ok" : "error",
    color: apiOk ? "var(--color-success)" : "var(--color-danger)",
  },
  {
    icon: Database,
    label: "Base de données",
    value: "PostgreSQL 15",
    status: "ok",
    color: "var(--color-success)",
  },
  {
    icon: Globe,
    label: "CDN",
    value: "Cloudflare",
    status: "ok",
    color: "var(--color-success)",
  },
  {
    icon: Shield,
    label: "SSL",
    value: "Actif (A+)",
    status: "ok",
    color: "var(--color-success)",
  },
  {
    icon: Clock,
    label: "Uptime",
    value: "99.97%",
    status: "ok",
    color: "var(--color-success)",
  },
  {
    icon: Activity,
    label: "Latence API",
    value: "42ms",
    status: "ok",
    color: "var(--color-success)",
  },
];

const resourceCards = [
  {
    icon: Cpu,
    label: "CPU",
    value: "23%",
    max: "100%",
    pct: 23,
    color: "var(--color-primary)",
  },
  {
    icon: HardDrive,
    label: "Stockage",
    value: "2.4 GB",
    max: "10 GB",
    pct: 24,
    color: "var(--color-accent)",
  },
  {
    icon: Database,
    label: "Mémoire",
    value: "1.2 GB",
    max: "4 GB",
    pct: 30,
    color: "var(--color-warning)",
  },
  {
    icon: Activity,
    label: "Bande passante",
    value: "45 GB",
    max: "100 GB",
    pct: 45,
    color: "var(--color-success)",
  },
];

const featureFlagDefs = [
  {
    key: "notifications",
    label: "Notifications push",
    desc: "Alertes stock et paiements",
    icon: Bell,
    defaultEnabled: true,
  },
  {
    key: "mobile",
    label: "App mobile PWA",
    desc: "Installation sur mobile",
    icon: Smartphone,
    defaultEnabled: true,
  },
  {
    key: "analytics",
    label: "Analytics avancés",
    desc: "Rapports détaillés",
    icon: BarChart3,
    defaultEnabled: false,
  },
  {
    key: "api",
    label: "API publique",
    desc: "Intégrations externes",
    icon: Zap,
    defaultEnabled: false,
  },
];

type LogEntry = { time: string; level: string; msg: string };

const initialLogs: LogEntry[] = [
  {
    time: "14:32:01",
    level: "info",
    msg: "Backup base de données complété (2.4 GB)",
  },
  {
    time: "14:30:15",
    level: "info",
    msg: "Déploiement v1.4.2 réussi — 0 erreurs",
  },
  {
    time: "12:15:33",
    level: "warn",
    msg: "Latence élevée sur endpoint /api/reports (850ms)",
  },
  {
    time: "10:00:00",
    level: "info",
    msg: "Tâche CRON: nettoyage sessions expirées (47 supprimées)",
  },
  {
    time: "08:45:12",
    level: "info",
    msg: "SSL certificat renouvelé automatiquement",
  },
  {
    time: "04:00:00",
    level: "info",
    msg: "Backup base de données complété (2.3 GB)",
  },
];

const FLAGS_KEY = "ecom360_bo_feature_flags";

const BACKEND_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "" : "http://localhost:8080");

async function fetchHealth(): Promise<{ status: string; ok: boolean }> {
  try {
    const res = await fetch(`${BACKEND_BASE || ""}/actuator/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => ({}));
    const status = (data.status as string) || (res.ok ? "UP" : "DOWN");
    return { status, ok: res.ok };
  } catch {
    return { status: "UNREACHABLE", ok: false };
  }
}

function loadFlags(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FLAGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return Object.fromEntries(
    featureFlagDefs.map((f) => [f.key, f.defaultEnabled]),
  );
}

function saveFlags(flags: Record<string, boolean>) {
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
}

export default function BackofficeSystem() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>(loadFlags);
  const [logs, setLogs] = useState(initialLogs);
  const [health, setHealth] = useState<{ status: string; ok: boolean } | null>(
    null,
  );
  const [modal, contextHolder] = Modal.useModal();

  const loadHealth = useCallback(() => {
    fetchHealth().then(setHealth);
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(id);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHealth();
    setTimeout(() => {
      setRefreshing(false);
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setLogs((prev) => [
        { time, level: "info", msg: "État du système actualisé manuellement" },
        ...prev,
      ]);
      message.success("Système actualisé");
    }, 1200);
  }, [loadHealth]);

  const handleExportLogs = useCallback(() => {
    const content = logs
      .map((l) => `[${l.time}] [${l.level.toUpperCase()}] ${l.msg}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success("Logs exportés");
  }, [logs]);

  const handleToggleFlag = useCallback(
    (key: string, label: string, checked: boolean) => {
      modal.confirm({
        title: `${checked ? "Activer" : "Désactiver"} "${label}" ?`,
        content: checked
          ? "Cette fonctionnalité sera disponible pour tous les utilisateurs."
          : "Cette fonctionnalité sera désactivée pour tous les utilisateurs.",
        okText: checked ? "Activer" : "Désactiver",
        okButtonProps: { danger: !checked },
        cancelText: "Annuler",
        onOk: () => {
          setFlags((prev) => {
            const next = { ...prev, [key]: checked };
            saveFlags(next);
            return next;
          });
          // Add log
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
          setLogs((prev) => [
            {
              time,
              level: "info",
              msg: `Feature flag "${label}" ${checked ? "activé" : "désactivé"}`,
            },
            ...prev,
          ]);
          message.success(`${label} ${checked ? "activé" : "désactivé"}`);
        },
      });
    },
    [modal],
  );

  if (loading) {
    return (
      <div className="pageWrapper">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      {contextHolder}
      <div className={styles.pageHeader}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Typography.Title level={4} className={styles.pageTitle}>
              Système
            </Typography.Title>
            <Typography.Text type="secondary" className={styles.pageSubtitle}>
              Santé de la plateforme, ressources et configuration
            </Typography.Text>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              icon={
                <RefreshCw
                  size={16}
                  className={refreshing ? "spin-icon" : ""}
                />
              }
              onClick={handleRefresh}
              loading={refreshing}
            >
              Actualiser
            </Button>
            <Button icon={<Download size={16} />} onClick={handleExportLogs}>
              Export logs
            </Button>
          </div>
        </div>
      </div>

      {/* Resource usage cards */}
      <Row gutter={[16, 16]} className={styles.systemGrid}>
        {resourceCards.map(({ icon: Icon, label, value, max, pct, color }) => (
          <Col xs={12} sm={6} key={label}>
            <Card bordered={false} className={styles.healthCard}>
              <div
                className={styles.healthIcon}
                style={{ background: `${color}10`, color }}
              >
                <Icon size={22} />
              </div>
              <span className={styles.healthValue}>{value}</span>
              <span className={styles.healthLabel}>
                {label} ({max})
              </span>
              <div
                style={{
                  marginTop: 10,
                  height: 6,
                  background: "var(--color-bg)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 3,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Services health */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            className={styles.card}
            title={
              <span className={styles.cardTitle}>
                <Activity size={18} />
                État des services
              </span>
            }
            extra={
              <Tag color={health?.ok ? "success" : "error"}>
                {health?.ok
                  ? "Tous opérationnels"
                  : health?.status === "UNREACHABLE"
                    ? "API injoignable"
                    : "Problème détecté"}
              </Tag>
            }
          >
            <div>
              {healthItems(health?.status ?? null, health?.ok ?? false).map(
                ({ icon: Icon, label, value, status, color }) => (
                  <div key={label} className={styles.envRow}>
                    <span
                      className={styles.envIcon}
                      style={{ background: `${color}10`, color }}
                    >
                      <Icon size={18} />
                    </span>
                    <div className={styles.envInfo}>
                      <span className={styles.envLabel}>{label}</span>
                      <span className={styles.envValue}>{value}</span>
                    </div>
                    <Tag
                      color={status === "ok" ? "success" : "error"}
                      style={{ margin: 0 }}
                    >
                      {status === "ok" ? "OK" : "Erreur"}
                    </Tag>
                  </div>
                ),
              )}
            </div>
          </Card>
        </Col>

        {/* Feature flags */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            className={styles.card}
            title={
              <span className={styles.cardTitle}>
                <Zap size={18} />
                Fonctionnalités
              </span>
            }
          >
            <div>
              {featureFlagDefs.map(({ key, label, desc, icon: Icon }) => (
                <div key={key} className={styles.envRow}>
                  <span
                    className={styles.envIcon}
                    style={{
                      background: flags[key]
                        ? "rgba(16,185,129,0.08)"
                        : "rgba(0,0,0,0.04)",
                      color: flags[key]
                        ? "var(--color-success)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className={styles.envInfo}>
                    <span className={styles.envLabel}>{label}</span>
                    <span className={styles.envValue}>{desc}</span>
                  </div>
                  <Switch
                    size="small"
                    checked={flags[key]}
                    onChange={(checked) =>
                      handleToggleFlag(key, label, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent logs */}
      <Card
        bordered={false}
        className={styles.card}
        title={
          <span className={styles.cardTitle}>
            <Server size={18} />
            Journal système
          </span>
        }
        style={{ marginTop: 16 }}
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {logs.length} entrées
          </Typography.Text>
        }
      >
        <div>
          {logs.map((log, i) => (
            <div key={`${log.time}-${i}`} className={styles.logRow}>
              <span className={styles.logTime}>{log.time}</span>
              <Tag
                color={
                  log.level === "warn"
                    ? "warning"
                    : log.level === "error"
                      ? "error"
                      : "default"
                }
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontFamily: "monospace",
                  minWidth: 40,
                  textAlign: "center",
                }}
              >
                {log.level.toUpperCase()}
              </Tag>
              <span className={styles.logMsg}>{log.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
