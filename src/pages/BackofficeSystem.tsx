import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Modal, Row, Space, Switch, Table, Typography, message } from "antd";
import { Activity, RefreshCw, Server } from "lucide-react";
import {
  getAdminSystemHealth,
  getLandingStatus,
  listAdminAuditLogs,
  listAdminFeatureFlags,
  updateAdminFeatureFlag,
  updateLandingStatus,
  type AdminFeatureFlag,
  type AdminSystemHealth,
  type AuditLogEntry,
} from "@/api/backoffice";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { StatusTag } from "@/components/backoffice/StatusTag";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { platformStatusFromOverall } from "@/backoffice/status";
import { formatAdminDateTime } from "@/utils/adminPeriod";
import { formatAuditAction } from "@/utils/auditAction";
import { t } from "@/i18n";
import styles from "./Backoffice.module.css";

function PlatformBanner({ health, failed }: { health: AdminSystemHealth | null; failed: boolean }) {
  const status = platformStatusFromOverall(failed ? null : health?.overall);
  const copy =
    status.key === "operational"
      ? "Tous les systèmes sont opérationnels"
      : status.key === "degraded"
        ? "Performance dégradée"
        : status.key === "down"
          ? "Incident en cours"
          : "État non vérifié";
  const background =
    status.tone === "ok"
      ? "var(--success-soft, var(--success-50, #e6f6f0))"
      : status.tone === "warn"
        ? "var(--warning-soft, var(--warning-50, #fef4e2))"
        : status.tone === "danger"
          ? "var(--danger-soft, var(--danger-50, #fdecec))"
          : "var(--surface-muted, var(--surface-2, #f1f3f7))";
  const color =
    status.tone === "ok"
      ? "var(--success)"
      : status.tone === "warn"
        ? "var(--warning)"
        : status.tone === "danger"
          ? "var(--danger)"
          : "var(--text-muted)";
  return (
    <div
      role="status"
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 16,
        padding: "12px 16px",
        borderRadius: 10,
        border: "1px solid var(--border, #e4e7ee)",
        background,
        color,
        fontWeight: 600,
      }}
    >
      <span>{copy}</span>
      {health?.generatedAt ? (
        <span style={{ fontWeight: 500, color: "var(--text-muted, #8590a6)" }}>
          {formatAdminDateTime(health.generatedAt)}
        </span>
      ) : null}
    </div>
  );
}

export default function BackofficeSystem() {
  const navigate = useNavigate();
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [flagSaving, setFlagSaving] = useState<string | null>(null);
  const [landingLoadingMode, setLandingLoadingMode] = useState<boolean | null>(null);
  const [landingSaving, setLandingSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [modal, contextHolder] = Modal.useModal();

  const load = useCallback(async () => {
    try {
      const [nextHealth, nextFlags, landing, audit] = await Promise.all([
        getAdminSystemHealth(),
        listAdminFeatureFlags(),
        getLandingStatus().catch(() => null),
        listAdminAuditLogs({ page: 0, size: 8 }),
      ]);
      setHealth(nextHealth);
      setHealthError(false);
      setFlags(nextFlags);
      if (landing) setLandingLoadingMode(landing.loading);
      setAuditLogs(audit.content ?? []);
    } catch (error) {
      setHealthError(true);
      message.error(error instanceof Error ? error.message : t.backoffice.systemRefreshed);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <div className={`${styles.page} pageWrapper`}>
      {contextHolder}
      <PageHeader
        title="Santé et configuration"
        subtitle="Contrôles vérifiés par l'API. Les métriques d'infrastructure non exposées restent indisponibles."
        extra={
          <Button icon={<RefreshCw size={16} />} onClick={() => void load()}>
            Actualiser
          </Button>
        }
      />

      <PlatformBanner health={health} failed={healthError} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card variant="borderless" className={styles.card} title="Services">
            {!health && healthError ? (
              <ErrorState
                compact
                title="Contrôle de santé indisponible"
                onRetry={() => void load()}
              />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                {health ? <StatusTag status={health.overall} /> : null}
                {(health?.services ?? []).map((service) => (
                  <div key={service.key} className={styles.planRow}>
                    <div className={styles.planMeta}>
                      <span className={styles.planName}>{service.label}</span>
                      <StatusTag status={service.status} />
                    </div>
                    <Typography.Text type="secondary">{service.detail}</Typography.Text>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card variant="borderless" className={styles.card} title="Métriques d'infrastructure">
            <EmptyState
              compact
              icon={Activity}
              title="Non connecté"
              description="CPU, mémoire, stockage, latence et l'historique d'uptime sur 90 jours ne sont pas exposés par l'API. Configurez une source de métriques. Aucune valeur de démonstration n'est affichée."
            />
          </Card>
        </Col>
      </Row>

      <Card
        variant="borderless"
        className={styles.card}
        title="Fonctionnalités plateforme"
        style={{ marginTop: 16 }}
      >
        {flags.length === 0 ? (
          <EmptyState compact icon={Server} title="Aucun indicateur persisté" />
        ) : (
          <Table
            rowKey="key"
            pagination={false}
            dataSource={flags}
            columns={[
              { title: "Fonctionnalité", dataIndex: "label" },
              { title: "Description", dataIndex: "description" },
              {
                title: "Dernière mise à jour",
                dataIndex: "updatedAt",
                render: formatAdminDateTime,
              },
              {
                title: "État",
                key: "enabled",
                render: (_, flag) => (
                  <Switch
                    checked={flag.enabled}
                    loading={flagSaving === flag.key}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                    onChange={(enabled) => {
                      modal.confirm({
                        title: enabled ? `Activer ${flag.label} ?` : `Désactiver ${flag.label} ?`,
                        content: "Ce changement est persisté et journalisé.",
                        okText: "Confirmer",
                        cancelText: "Annuler",
                        onOk: async () => {
                          setFlagSaving(flag.key);
                          try {
                            const updated = await updateAdminFeatureFlag(flag.key, enabled);
                            setFlags((current) =>
                              current.map((item) => (item.key === flag.key ? updated : item))
                            );
                            message.success(
                              enabled
                                ? t.backoffice.featureFlagEnabled.replace("{label}", flag.label)
                                : t.backoffice.featureFlagDisabled.replace("{label}", flag.label)
                            );
                          } catch (error) {
                            message.error(
                              error instanceof Error
                                ? error.message
                                : "Impossible de modifier cette configuration avec votre rôle actuel."
                            );
                          } finally {
                            setFlagSaving(null);
                          }
                        },
                      });
                    }}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card
        variant="borderless"
        className={styles.card}
        title="Paramètres plateforme"
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" size={8}>
          <Typography.Text strong>Mode préparation de la landing</Typography.Text>
          <Typography.Text type="secondary">
            Affiche l'écran de pré-lancement sur le site marketing.
          </Typography.Text>
          <Switch
            checked={Boolean(landingLoadingMode)}
            loading={landingSaving}
            disabled={landingLoadingMode == null}
            onChange={async (checked) => {
              setLandingSaving(true);
              try {
                const status = await updateLandingStatus(checked);
                setLandingLoadingMode(status.loading);
                message.success(
                  status.loading
                    ? "La landing affiche l'écran de préparation."
                    : "Le site marketing est ouvert."
                );
              } catch (error) {
                message.error(
                  error instanceof Error ? error.message : "Impossible de modifier la landing."
                );
              } finally {
                setLandingSaving(false);
              }
            }}
          />
        </Space>
      </Card>

      <Card
        variant="borderless"
        className={styles.card}
        title="Derniers événements système"
        style={{ marginTop: 16 }}
        extra={
          <Button type="link" onClick={() => navigate("/backoffice/audit")}>
            Journal complet
          </Button>
        }
      >
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={auditLogs}
          columns={[
            { title: "Action", dataIndex: "action", render: formatAuditAction },
            { title: "Entité", dataIndex: "entityType" },
            { title: "Date", dataIndex: "createdAt", render: formatAdminDateTime },
          ]}
          locale={{ emptyText: "Aucun événement correspondant aux filtres" }}
        />
      </Card>
    </div>
  );
}
