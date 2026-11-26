import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Drawer,
  InputNumber,
  Row,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from "antd";
import { Flag, Pencil, RefreshCw } from "lucide-react";
import { listAdminPlans, updateAdminPlan, type AdminPlanItem } from "@/api/backoffice";
import { PLAN_FEATURES } from "@/backoffice/planFeatures";
import { useCan } from "@/backoffice/rbac/useCan";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { StatusTag } from "@/components/backoffice/StatusTag";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { formatAdminMoney } from "@/utils/adminMoney";
import styles from "./Backoffice.module.css";

type PlanDraft = {
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxStores: number;
  maxProducts: number;
  maxSalesPerMonth: number;
  maxClients: number;
  maxSuppliers: number;
  dataRetentionMonths: number;
  active: boolean;
  features: Record<string, boolean>;
};

function draftFrom(plan: AdminPlanItem): PlanDraft {
  const features: Record<string, boolean> = {};
  for (const feature of PLAN_FEATURES) {
    features[feature.key] = Boolean(plan.features?.[feature.key]);
  }
  return {
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    maxUsers: plan.maxUsers ?? 0,
    maxStores: plan.maxStores ?? 0,
    maxProducts: plan.maxProducts ?? 0,
    maxSalesPerMonth: plan.maxSalesPerMonth ?? 0,
    maxClients: plan.maxClients ?? 0,
    maxSuppliers: plan.maxSuppliers ?? 0,
    dataRetentionMonths: plan.dataRetentionMonths ?? 0,
    active: plan.active !== false,
    features,
  };
}

export default function BackofficePlans() {
  const navigate = useNavigate();
  const can = useCan();
  const canWrite = can("plans.write");
  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [editing, setEditing] = useState<AdminPlanItem | null>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      setPlans(await listAdminPlans());
    } catch {
      setHasError(true);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Plans d'abonnement"
        subtitle="Catalogue commercial. Un nouveau prix s'applique aux prochains paiements ; les factures déjà émises restent inchangées. 0 = illimité pour une limite."
        extra={
          <Button icon={<RefreshCw size={16} />} onClick={() => void load()} loading={loading}>
            Actualiser
          </Button>
        }
      />
      {hasError ? (
        <ErrorState title="Impossible de charger les plans" onRetry={() => void load()} />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {plans.map((plan) => (
              <Col xs={24} md={8} key={plan.id}>
                <Card
                  variant="borderless"
                  className={styles.card}
                  hoverable
                  onClick={() =>
                    navigate(`/backoffice/businesses?plan=${encodeURIComponent(plan.name)}`)
                  }
                >
                  <Typography.Title level={4} style={{ marginTop: 0 }}>
                    {plan.name}
                  </Typography.Title>
                  <Typography.Text type="secondary">{plan.slug}</Typography.Text>
                  <div className={styles.kpiValue} style={{ fontSize: 24, marginTop: 12 }}>
                    {formatAdminMoney(plan.priceMonthly)}
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {" "}
                      / mois
                    </Typography.Text>
                  </div>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                    {formatAdminMoney(plan.priceYearly)} / an · {plan.maxStores ?? "—"} boutiques ·{" "}
                    {plan.maxUsers ?? "—"} utilisateurs
                  </Typography.Paragraph>
                  <StatusTag status={plan.active === false ? "inactive" : "active"} />
                  {canWrite ? (
                    <div style={{ marginTop: 12 }}>
                      <Button
                        size="small"
                        icon={<Pencil size={14} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditing(plan);
                          setDraft(draftFrom(plan));
                        }}
                      >
                        Modifier
                      </Button>
                    </div>
                  ) : null}
                  <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                    {plan.subscribedCompanies ?? 0} entreprise
                    {(plan.subscribedCompanies ?? 0) > 1 ? "s" : ""} abonnée
                    {(plan.subscribedCompanies ?? 0) > 1 ? "s" : ""}
                  </Typography.Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
          <Card variant="borderless" className={styles.card}>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={plans}
              locale={{
                emptyText: (
                  <EmptyState
                    compact
                    icon={Flag}
                    title="Aucun plan"
                    description="Aucun plan n'est défini."
                  />
                ),
              }}
              columns={[
                { title: "Plan", dataIndex: "name", key: "name" },
                {
                  title: "Mensuel",
                  dataIndex: "priceMonthly",
                  render: (value: number) => formatAdminMoney(value),
                },
                {
                  title: "Annuel",
                  dataIndex: "priceYearly",
                  render: (value: number) => formatAdminMoney(value),
                },
                { title: "Boutiques", dataIndex: "maxStores", key: "maxStores" },
                { title: "Utilisateurs", dataIndex: "maxUsers", key: "maxUsers" },
                {
                  title: "Abonnés",
                  dataIndex: "subscribedCompanies",
                  key: "subscribedCompanies",
                },
                {
                  title: "État",
                  key: "active",
                  render: (_, plan) => (
                    <StatusTag status={plan.active === false ? "inactive" : "active"} />
                  ),
                },
                {
                  title: "Droits",
                  key: "entitlements",
                  render: (_, plan) => (plan.entitlements ?? []).join(", ") || "—",
                },
                {
                  title: "",
                  key: "edit",
                  width: 120,
                  render: (_, plan) =>
                    canWrite ? (
                      <Button
                        size="small"
                        icon={<Pencil size={14} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditing(plan);
                          setDraft(draftFrom(plan));
                        }}
                      >
                        Modifier
                      </Button>
                    ) : null,
                },
              ]}
              pagination={false}
              scroll={{ x: 960 }}
              onRow={(plan) => ({
                onClick: () =>
                  navigate(`/backoffice/businesses?plan=${encodeURIComponent(plan.name)}`),
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        </>
      )}
      <Drawer
        title={editing ? `Modifier ${editing.name}` : "Plan"}
        open={editing != null}
        width="min(480px, 100vw)"
        onClose={() => {
          setEditing(null);
          setDraft(null);
        }}
        extra={
          <Space>
            <Button
              onClick={() => {
                setEditing(null);
                setDraft(null);
              }}
            >
              Annuler
            </Button>
            <Button type="primary" loading={saving} disabled={!draft} onClick={() => void save()}>
              Enregistrer
            </Button>
          </Space>
        }
      >
        {draft ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              Les montants sont en XOF. Les factures déjà émises ne sont pas recalculées.
            </Typography.Text>
            <Field label="Prix mensuel">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.priceMonthly}
                onChange={(value) => setDraft({ ...draft, priceMonthly: Number(value ?? 0) })}
              />
            </Field>
            <Field label="Prix annuel">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.priceYearly}
                onChange={(value) => setDraft({ ...draft, priceYearly: Number(value ?? 0) })}
              />
            </Field>
            <Field label="Utilisateurs (0 = illimité)">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.maxUsers}
                onChange={(value) => setDraft({ ...draft, maxUsers: Number(value ?? 0) })}
              />
            </Field>
            <Field label="Boutiques (0 = illimité)">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.maxStores}
                onChange={(value) => setDraft({ ...draft, maxStores: Number(value ?? 0) })}
              />
            </Field>
            <Field label="Produits (0 = illimité)">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.maxProducts}
                onChange={(value) => setDraft({ ...draft, maxProducts: Number(value ?? 0) })}
              />
            </Field>
            <Field label="Ventes / mois (0 = illimité)">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.maxSalesPerMonth}
                onChange={(value) => setDraft({ ...draft, maxSalesPerMonth: Number(value ?? 0) })}
              />
            </Field>
            <Field label="Clients (0 = illimité)">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.maxClients}
                onChange={(value) => setDraft({ ...draft, maxClients: Number(value ?? 0) })}
              />
            </Field>
            <Field label="Fournisseurs (0 = illimité)">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.maxSuppliers}
                onChange={(value) => setDraft({ ...draft, maxSuppliers: Number(value ?? 0) })}
              />
            </Field>
            <Field label="Rétention (mois, 0 = illimitée)">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                value={draft.dataRetentionMonths}
                onChange={(value) =>
                  setDraft({ ...draft, dataRetentionMonths: Number(value ?? 0) })
                }
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Plan actif</span>
              <Switch
                checked={draft.active}
                onChange={(active) => setDraft({ ...draft, active })}
              />
            </div>
            <Typography.Title level={5} style={{ marginBottom: 0 }}>
              Fonctionnalités
            </Typography.Title>
            {PLAN_FEATURES.map((feature) => (
              <div
                key={feature.key}
                style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
              >
                <span>{feature.label}</span>
                <Switch
                  checked={draft.features[feature.key] === true}
                  onChange={(enabled) =>
                    setDraft({
                      ...draft,
                      features: { ...draft.features, [feature.key]: enabled },
                    })
                  }
                />
              </div>
            ))}
          </Space>
        ) : null}
      </Drawer>
    </div>
  );

  async function save() {
    if (!editing || !draft) return;
    setSaving(true);
    try {
      const updated = await updateAdminPlan(editing.id, draft);
      setPlans((current) => current.map((plan) => (plan.id === updated.id ? updated : plan)));
      setEditing(null);
      setDraft(null);
      message.success("Plan enregistré");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </Typography.Text>
      {children}
    </label>
  );
}
