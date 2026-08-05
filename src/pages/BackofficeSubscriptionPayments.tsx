import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Typography,
  Button,
  Select,
  Space,
  Modal,
  Input,
  message,
  Tag,
  DatePicker,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CreditCard, CheckCircle } from "lucide-react";
import dayjs from "dayjs";
import {
  listAdminSubscriptionPayments,
  markAdminSubscriptionPaymentPaid,
  type AdminSubscriptionPayment,
} from "@/api/backoffice";
import styles from "./Backoffice.module.css";

const STATUS_COLOR: Record<string, string> = {
  pending: "processing",
  paid: "success",
  failed: "error",
  cancelled: "default",
  expired: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
  expired: "Expiré",
};

const CHANNEL_LABEL: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
};

function formatFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " F";
}

export default function BackofficeSubscriptionPayments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminSubscriptionPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    searchParams.get("status") ?? undefined
  );
  const businessId = searchParams.get("businessId") ?? undefined;
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminSubscriptionPayments({
        page,
        size: pageSize,
        status: statusFilter,
        businessId,
        from,
        to,
      });
      setRows(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur de chargement");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, businessId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkPaid = (row: AdminSubscriptionPayment) => {
    let note = "";
    Modal.confirm({
      title: "Marquer ce paiement comme payé ?",
      content: (
        <div>
          <p>
            {row.businessName} — {row.planName} ({formatFCFA(row.amount)})
          </p>
          <Input.TextArea
            placeholder="Note support (optionnel)"
            rows={2}
            onChange={(e) => {
              note = e.target.value;
            }}
          />
        </div>
      ),
      okText: "Confirmer le paiement",
      cancelText: "Annuler",
      onOk: async () => {
        setActionLoading(row.intentId);
        try {
          await markAdminSubscriptionPaymentPaid(row.intentId, note || undefined);
          message.success("Paiement confirmé — abonnement activé");
          load();
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Erreur");
          throw e;
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const columns: ColumnsType<AdminSubscriptionPayment> = [
    {
      title: "Date",
      dataIndex: "createdAt",
      width: 160,
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
    },
    {
      title: "Entreprise",
      dataIndex: "businessName",
      render: (name: string, row) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => navigate(`/backoffice/businesses?highlight=${row.businessId}`)}
        >
          {name || row.businessId?.slice(0, 8)}
        </Button>
      ),
    },
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <span>
          {row.planName || row.planSlug}{" "}
          <Typography.Text type="secondary">({row.billingCycle})</Typography.Text>
        </span>
      ),
    },
    {
      title: "Montant",
      dataIndex: "amount",
      align: "right",
      render: (n: number) => formatFCFA(n),
    },
    {
      title: "Canal",
      dataIndex: "channel",
      render: (c: string) => CHANNEL_LABEL[c] || c,
    },
    {
      title: "Statut",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLOR[s] || "default"}>{STATUS_LABEL[s] || s}</Tag>,
    },
    {
      title: "Facture",
      dataIndex: "invoiceNumber",
      render: (n?: string) => n || "—",
    },
    {
      title: "Réf. PSP",
      dataIndex: "externalToken",
      ellipsis: true,
      width: 140,
      render: (t?: string) => t || "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, row) =>
        row.status === "pending" ? (
          <Button
            size="small"
            type="primary"
            icon={<CheckCircle size={14} />}
            loading={actionLoading === row.intentId}
            onClick={() => handleMarkPaid(row)}
          >
            Marquer payé
          </Button>
        ) : null,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Typography.Title level={4} className={styles.pageTitle}>
          <CreditCard size={20} style={{ marginRight: 8, verticalAlign: -3 }} />
          Paiements abonnements
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.pageSubtitle}>
          Historique des intentions de paiement Wave / Orange Money (PayDunya)
        </Typography.Text>
      </header>

      <Card variant="borderless" className={styles.tableCard}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Statut"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(0);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (v) next.set("status", v);
                else next.delete("status");
                return next;
              });
            }}
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <DatePicker.RangePicker
            onChange={(dates) => {
              setFrom(dates?.[0] ? dates[0].format("YYYY-MM-DD") : undefined);
              setTo(dates?.[1] ? dates[1].format("YYYY-MM-DD") : undefined);
              setPage(0);
            }}
          />
          {businessId && (
            <Tag
              closable
              onClose={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("businessId");
                  return next;
                });
                navigate("/backoffice/payments");
              }}
            >
              Entreprise filtrée
            </Tag>
          )}
        </Space>

        <Table
          rowKey="intentId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1100 }}
          pagination={{
            current: page + 1,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p - 1);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}
