import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Table,
  Select,
  Space,
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
  FileText,
} from "lucide-react";
import { listAdminAuditLogs, type AuditLogEntry } from "@/api/backoffice";
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

const FLAGS_KEY = "ecom360_bo_feature_flags";

const ENTITY_TYPES = ["Auth", "Product", "Sale", "Client", "Supplier", "Store", "Expense"];

function formatAuditAction(action: string): string {
  const labels: Record<string, string> = {
    LOGIN: "Connexion",
    REGISTER: "Inscription",
    PASSWORD_CHANGE: "Changement mot de passe",
    CREATE: "Création",
    UPDATE: "Modification",
    DELETE: "Suppression",
  };
  return labels[action] ?? action;
}

// Same base URL logic as API client (dev: localhost:8080, prod: VITE_API_URL or '')
const BACKEND_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8080" : "");

async function fetchHealth(): Promise<{ status: string; ok: boolean }> {
  try {
    const url = BACKEND_BASE
      ? `${BACKEND_BASE.replace(/\/$/, "")}/actuator/health`
      : "/actuator/health";
    const res = await fetch(url, {
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
  return Object.fromEntries(featureFlagDefs.map((f) => [f.key, f.defaultEnabled]));
}

function saveFlags(flags: Record<string, boolean>) {
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
}

export default function BackofficeSystem() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>(loadFlags);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditSize] = useState(20);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditEntityFilter, setAuditEntityFilter] = useState<string | undefined>();
  const [health, setHealth] = useState<{ status: string; ok: boolean } | null>(null);
  const [modal, contextHolder] = Modal.useModal();

  const loadHealth = useCallback(() => {
    fetchHealth().then(setHealth);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await listAdminAuditLogs({
        page: auditPage,
        size: auditSize,
        entityType: auditEntityFilter,
      });
      setAuditLogs(res.content);
      setAuditTotal(res.totalElements);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement journal d'audit");
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditSize, auditEntityFilter]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(id);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHealth();
    loadAuditLogs();
    setTimeout(() => {
      setRefreshing(false);
      message.success("Système actualisé");
    }, 800);
  }, [loadHealth, loadAuditLogs]);

  const handleExportAudit = useCallback(async () => {
    try {
      const res = await listAdminAuditLogs({
        page: 0,
        size: 500,
        entityType: auditEntityFilter,
      });
      const lines = res.content.map(
        (l) =>
          `${l.createdAt}\t${l.action}\t${l.entityType}\t${l.entityId ?? ""}\t${l.businessId ?? ""}\t${l.userId ?? ""}\t${l.ipAddress ?? ""}`
      );
      const content = ["Date\tAction\tType\tEntityId\tBusinessId\tUserId\tIP", ...lines].join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("Journal d'audit exporté");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur export");
    }
  }, [auditEntityFilter]);

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
          message.success(`${label} ${checked ? "activé" : "désactivé"}`);
        },
      });
    },
    [modal]
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
              icon={<RefreshCw size={16} className={refreshing ? "spin-icon" : ""} />}
              onClick={handleRefresh}
              loading={refreshing}
            >
              Actualiser
            </Button>
            <Button icon={<Download size={16} />} onClick={handleExportAudit}>
              Export audit
            </Button>
          </div>
        </div>
      </div>

      {/* Resource usage cards (demo data) */}
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
        Ressources — données de démonstration
      </Typography.Text>
      <Row gutter={[16, 16]} className={styles.systemGrid}>
        {resourceCards.map(({ icon: Icon, label, value, max, pct, color }) => (
          <Col xs={12} sm={6} key={label}>
            <Card variant="borderless" className={styles.healthCard}>
              <div className={styles.healthIcon} style={{ background: `${color}10`, color }}>
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
            variant="borderless"
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
                    <span className={styles.envIcon} style={{ background: `${color}10`, color }}>
                      <Icon size={18} />
                    </span>
                    <div className={styles.envInfo}>
                      <span className={styles.envLabel}>{label}</span>
                      <span className={styles.envValue}>{value}</span>
                    </div>
                    <Tag color={status === "ok" ? "success" : "error"} style={{ margin: 0 }}>
                      {status === "ok" ? "OK" : "Erreur"}
                    </Tag>
                  </div>
                )
              )}
            </div>
          </Card>
        </Col>

        {/* Feature flags (localStorage only) */}
        <Col xs={24} lg={12}>
          <Card
            variant="borderless"
            className={styles.card}
            title={
              <span className={styles.cardTitle}>
                <Zap size={18} />
                Fonctionnalités
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}
                >
                  (local)
                </Typography.Text>
              </span>
            }
          >
            <div>
              {featureFlagDefs.map(({ key, label, desc, icon: Icon }) => (
                <div key={key} className={styles.envRow}>
                  <span
                    className={styles.envIcon}
                    style={{
                      background: flags[key] ? "rgba(16,185,129,0.08)" : "rgba(0,0,0,0.04)",
                      color: flags[key] ? "var(--color-success)" : "var(--color-text-muted)",
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
                    onChange={(checked) => handleToggleFlag(key, label, checked)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Audit trail — real data from backend */}
      <Card
        variant="borderless"
        className={styles.card}
        title={
          <span className={styles.cardTitle}>
            <FileText size={18} />
            Journal d'audit
          </span>
        }
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Select
              placeholder="Filtrer par type"
              allowClear
              style={{ width: 140 }}
              value={auditEntityFilter}
              onChange={setAuditEntityFilter}
              options={ENTITY_TYPES.map((t) => ({ label: t, value: t }))}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {auditTotal} entrée(s)
            </Typography.Text>
            <Button type="link" size="small" onClick={() => navigate("/backoffice/audit")}>
              Voir tout
            </Button>
          </Space>
        }
      >
        <Table
          size="small"
          loading={auditLoading}
          dataSource={auditLogs}
          rowKey="id"
          pagination={{
            current: auditPage + 1,
            pageSize: auditSize,
            total: auditTotal,
            showSizeChanger: false,
            showTotal: (t) => `${t} entrées`,
            onChange: (p) => setAuditPage(p - 1),
          }}
          columns={[
            {
              title: "Date",
              dataIndex: "createdAt",
              key: "createdAt",
              width: 180,
              render: (v: string) =>
                v
                  ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })
                  : "—",
            },
            {
              title: "Action",
              dataIndex: "action",
              key: "action",
              width: 120,
              render: (v: string) => (
                <Tag color={v === "DELETE" ? "error" : v === "CREATE" ? "success" : "default"}>
                  {formatAuditAction(v)}
                </Tag>
              ),
            },
            {
              title: "Type",
              dataIndex: "entityType",
              key: "entityType",
              width: 100,
            },
            {
              title: "Entité",
              dataIndex: "entityId",
              key: "entityId",
              ellipsis: true,
              render: (v: string | null) =>
                v ? (
                  <Typography.Text copyable style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {v.slice(0, 8)}…
                  </Typography.Text>
                ) : (
                  "—"
                ),
            },
            {
              title: "Business",
              dataIndex: "businessId",
              key: "businessId",
              ellipsis: true,
              render: (v: string | null) =>
                v ? (
                  <Typography.Text copyable style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {v.slice(0, 8)}…
                  </Typography.Text>
                ) : (
                  "—"
                ),
            },
            {
              title: "IP",
              dataIndex: "ipAddress",
              key: "ipAddress",
              width: 110,
              render: (v: string | null) => v ?? "—",
            },
          ]}
        />
      </Card>
    </div>
  );
}
