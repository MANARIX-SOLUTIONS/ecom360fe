import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Typography,
  Button,
  Select,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Drawer,
  Descriptions,
  Divider,
} from "antd";
import { CheckCircle, XCircle, Inbox, Eye, Search, Mail, Phone } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  listAdminDemoRequests,
  approveAdminDemoRequest,
  rejectAdminDemoRequest,
  type AdminDemoRequest,
} from "@/api/backoffice";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { FilterBar } from "@/components/backoffice/FilterBar";
import { StatusTag } from "@/components/backoffice/StatusTag";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/i18n";
import styles from "./Backoffice.module.css";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Validée",
  rejected: "Refusée",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
};

export default function BackofficeDemoRequests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminDemoRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const statusParam = searchParams.get("status");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    statusParam === "all" ? undefined : (statusParam ?? "pending")
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [searchDebounced, setSearchDebounced] = useState(searchParams.get("search") ?? "");
  const [rejectModal, setRejectModal] = useState<AdminDemoRequest | null>(null);
  const [rejectForm] = Form.useForm<{ reason: string }>();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminDemoRequest | null>(null);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const res = await listAdminDemoRequests({
        page,
        size: pageSize,
        status: statusFilter,
        search: searchDebounced || undefined,
      });
      setRows(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.backoffice.demoRequestsLoadError);
      setHasError(true);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, searchDebounced]);

  useEffect(() => {
    const id = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchDebounced) next.set("search", searchDebounced);
    next.set("status", statusFilter ?? "all");
    setSearchParams(next, { replace: true });
  }, [searchDebounced, statusFilter, setSearchParams]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (r: AdminDemoRequest) => {
    Modal.confirm({
      title: "Valider cette demande ?",
      content: `Un compte sera créé pour ${r.email} (${r.businessName}) avec essai gratuit. Le demandeur recevra un e-mail (lien mot de passe si besoin).`,
      okText: "Valider",
      cancelText: "Annuler",
      onOk: async () => {
        setActionLoading(r.id);
        try {
          const created = await approveAdminDemoRequest(r.id);
          message.success(t.backoffice.demoAccountCreated);
          setDetail(null);
          load();
          if (created?.businessId) {
            navigate(`/backoffice/businesses?highlight=${created.businessId}`);
          }
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const submitReject = async () => {
    if (!rejectModal) return;
    const reason = rejectForm.getFieldValue("reason")?.trim();
    setActionLoading(rejectModal.id);
    try {
      await rejectAdminDemoRequest(rejectModal.id, reason || undefined);
      message.success(t.backoffice.demoRequestRejected);
      setRejectModal(null);
      setDetail(null);
      rejectForm.resetFields();
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Demandes de démo"
        subtitle="Validez ou refusez les inscriptions avant création du compte entreprise."
      />

      <Card variant="borderless" className={styles.card}>
        <FilterBar>
          <Input.Search
            allowClear
            placeholder="Entreprise, contact ou e-mail"
            value={search}
            onChange={(event) => {
              setPage(0);
              setSearch(event.target.value);
            }}
            style={{ width: 280 }}
            prefix={<Search size={14} />}
          />
          <Select
            style={{ width: 200 }}
            value={statusFilter ?? "all"}
            onChange={(v) => {
              setPage(0);
              setStatusFilter(v === "all" ? undefined : v);
            }}
            options={[
              { value: "all", label: "Tous les statuts" },
              { value: "pending", label: "En attente" },
              { value: "approved", label: "Validées" },
              { value: "rejected", label: "Refusées" },
            ]}
          />
        </FilterBar>

        <div className="tableResponsive">
          <Table<AdminDemoRequest>
            className="dataTable"
            rowKey="id"
            loading={loading}
            dataSource={rows}
            scroll={{ x: "max-content" }}
            pagination={{
              current: page + 1,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (p, s) => {
                setPage((p ?? 1) - 1);
                setPageSize(s ?? 20);
              },
            }}
            locale={{
              emptyText: hasError ? (
                <ErrorState
                  compact
                  title="Impossible de charger les demandes"
                  onRetry={() => void load()}
                />
              ) : (
                <EmptyState
                  compact
                  icon={Inbox}
                  title={
                    statusFilter === "pending"
                      ? "Aucune demande en attente — tout est traité"
                      : "Aucune demande pour ces filtres"
                  }
                  description={
                    statusFilter === "pending"
                      ? "Les nouvelles demandes apparaîtront ici."
                      : "Élargissez la recherche ou changez le statut."
                  }
                  action={
                    statusFilter ? (
                      <Button
                        type="link"
                        onClick={() => {
                          setPage(0);
                          setStatusFilter(undefined);
                        }}
                      >
                        Voir l'historique
                      </Button>
                    ) : (
                      <Button
                        type="link"
                        onClick={() => {
                          setPage(0);
                          setSearch("");
                          setStatusFilter(undefined);
                        }}
                      >
                        Réinitialiser les filtres
                      </Button>
                    )
                  }
                />
              ),
            }}
            onRow={(record) => ({
              onClick: () => setDetail(record),
              style: { cursor: "pointer" },
            })}
            columns={[
              {
                title: "Date",
                width: 160,
                render: (_, r) =>
                  new Date(r.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
              },
              { title: "Entreprise", dataIndex: "businessName", ellipsis: true },
              { title: "Contact", dataIndex: "fullName", width: 140, ellipsis: true },
              { title: "E-mail", dataIndex: "email", ellipsis: true },
              {
                title: "Téléphone",
                dataIndex: "phone",
                width: 130,
                render: (value: string | null) => value || "—",
              },
              {
                title: "Secteur",
                dataIndex: "sector",
                width: 140,
                render: (value: string | null) => value || "—",
              },
              {
                title: "Statut",
                width: 120,
                render: (_, r) => <StatusTag status={r.status} />,
              },
              {
                title: "Actions",
                key: "actions",
                width: 280,
                render: (_, r) => (
                  <Space onClick={(e) => e.stopPropagation()} size={4}>
                    <Button
                      type="link"
                      size="small"
                      icon={<Eye size={14} />}
                      onClick={() => setDetail(r)}
                    >
                      Détails
                    </Button>
                    {r.status === "pending" ? (
                      <>
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckCircle size={14} />}
                          loading={actionLoading === r.id}
                          onClick={() => handleApprove(r)}
                        >
                          Approuver
                        </Button>
                        <Button
                          danger
                          size="small"
                          icon={<XCircle size={14} />}
                          loading={actionLoading === r.id}
                          onClick={() => {
                            rejectForm.resetFields();
                            setRejectModal(r);
                          }}
                        >
                          Refuser
                        </Button>
                      </>
                    ) : r.status === "rejected" && r.rejectionReason ? (
                      <Typography.Text type="secondary" ellipsis style={{ maxWidth: 140 }}>
                        {r.rejectionReason}
                      </Typography.Text>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Drawer
        title="Détail de la demande de démo"
        placement="right"
        width={Math.min(560, typeof window !== "undefined" ? window.innerWidth - 24 : 560)}
        open={!!detail}
        onClose={() => setDetail(null)}
        destroyOnClose
        extra={
          <Space>
            {detail?.email ? (
              <Button icon={<Mail size={16} />} href={`mailto:${detail.email}`}>
                Contacter
              </Button>
            ) : null}
            {detail?.phone ? (
              <Button icon={<Phone size={16} />} href={`tel:${detail.phone}`}>
                Appeler
              </Button>
            ) : null}
            {detail?.status === "pending" ? (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircle size={16} />}
                  loading={actionLoading === detail.id}
                  onClick={() => detail && handleApprove(detail)}
                >
                  Valider
                </Button>
                <Button
                  danger
                  icon={<XCircle size={16} />}
                  loading={actionLoading === detail.id}
                  onClick={() => {
                    if (detail) {
                      rejectForm.resetFields();
                      setRejectModal(detail);
                    }
                  }}
                >
                  Refuser
                </Button>
              </>
            ) : null}
          </Space>
        }
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Identifiant">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={STATUS_COLOR[detail.status] ?? "default"}>
                  {STATUS_LABELS[detail.status] ?? detail.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reçue le">
                {new Date(detail.createdAt).toLocaleString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Contact</Divider>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Nom complet">{detail.fullName}</Descriptions.Item>
              <Descriptions.Item label="E-mail">{detail.email}</Descriptions.Item>
              <Descriptions.Item label="Téléphone">
                {detail.phone?.trim() ? detail.phone : "—"}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Entreprise & contexte</Divider>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Raison sociale / commerce">
                {detail.businessName}
              </Descriptions.Item>
              <Descriptions.Item label="Fonction">
                {detail.jobTitle?.trim() || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Ville / région">
                {detail.city?.trim() || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Secteur">{detail.sector?.trim() || "—"}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Message du demandeur</Divider>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {detail.message?.trim() ? detail.message : "Aucun message"}
            </Typography.Paragraph>

            {(detail.status !== "pending" || detail.reviewedAt || detail.reviewedByUserId) && (
              <>
                <Divider orientation="left">Traitement</Divider>
                <Descriptions column={1} size="small" bordered>
                  {detail.reviewedAt && (
                    <Descriptions.Item label="Traité le">
                      {new Date(detail.reviewedAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Descriptions.Item>
                  )}
                  {detail.reviewedByUserId && (
                    <Descriptions.Item label="Traité par (utilisateur plateforme)">
                      <Typography.Text copyable>{detail.reviewedByUserId}</Typography.Text>
                    </Descriptions.Item>
                  )}
                  {detail.status === "rejected" && (
                    <Descriptions.Item label="Motif du refus">
                      {detail.rejectionReason?.trim() ? detail.rejectionReason : "—"}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}
          </>
        )}
      </Drawer>

      <Modal
        title="Refuser la demande"
        open={!!rejectModal}
        onCancel={() => {
          setRejectModal(null);
          rejectForm.resetFields();
        }}
        okText="Refuser"
        okButtonProps={{ danger: true }}
        confirmLoading={rejectModal != null && actionLoading === rejectModal.id}
        onOk={submitReject}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="reason" label="Motif (optionnel)">
            <Input.TextArea rows={3} placeholder="Visible en interne" maxLength={2000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
