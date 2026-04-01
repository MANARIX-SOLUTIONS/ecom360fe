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
import { CheckCircle, XCircle, Inbox, Eye } from "lucide-react";
import {
  listAdminDemoRequests,
  approveAdminDemoRequest,
  rejectAdminDemoRequest,
  type AdminDemoRequest,
} from "@/api/backoffice";
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
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminDemoRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>("pending");
  const [rejectModal, setRejectModal] = useState<AdminDemoRequest | null>(null);
  const [rejectForm] = Form.useForm<{ reason: string }>();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminDemoRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminDemoRequests({
        page,
        size: pageSize,
        status: statusFilter,
      });
      setRows(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

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
          await approveAdminDemoRequest(r.id);
          message.success("Compte créé — le demandeur peut se connecter.");
          setDetail(null);
          load();
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Erreur");
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
      message.success("Demande refusée");
      setRejectModal(null);
      setDetail(null);
      rejectForm.resetFields();
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      <div className={styles.header}>
        <Typography.Title level={2} className={styles.title}>
          Demandes de démo
        </Typography.Title>
        <Typography.Text type="secondary">
          Validez ou refusez les inscriptions avant création du compte entreprise.
        </Typography.Text>
      </div>

      <Card variant="borderless" className={styles.card}>
        <Space style={{ marginBottom: 16 }} wrap>
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
        </Space>

        <div className="tableResponsive">
          <Table<AdminDemoRequest>
            rowKey="id"
            loading={loading}
            dataSource={rows}
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
              emptyText: (
                <div style={{ padding: 32, textAlign: "center" }}>
                  <Inbox size={40} strokeWidth={1.2} style={{ opacity: 0.35 }} />
                  <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    Aucune demande
                  </Typography.Text>
                </div>
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
                title: "Statut",
                width: 120,
                render: (_, r) => (
                  <Tag color={STATUS_COLOR[r.status] ?? "default"}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </Tag>
                ),
              },
              {
                title: "",
                key: "detail",
                width: 88,
                render: (_, r) => (
                  <Button
                    type="link"
                    size="small"
                    icon={<Eye size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetail(r);
                    }}
                  >
                    Détails
                  </Button>
                ),
              },
              {
                title: "",
                key: "actions",
                width: 200,
                render: (_, r) =>
                  r.status === "pending" ? (
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckCircle size={14} />}
                        loading={actionLoading === r.id}
                        onClick={() => handleApprove(r)}
                      >
                        Valider
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
                    </Space>
                  ) : r.status === "rejected" && r.rejectionReason ? (
                    <Typography.Text type="secondary" ellipsis style={{ maxWidth: 200 }}>
                      {r.rejectionReason}
                    </Typography.Text>
                  ) : null,
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
          detail?.status === "pending" ? (
            <Space>
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
            </Space>
          ) : null
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
