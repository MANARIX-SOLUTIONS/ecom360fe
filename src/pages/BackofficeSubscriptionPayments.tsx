import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Typography,
  Button,
  Select,
  Modal,
  Input,
  message,
  Tag,
  DatePicker,
  Descriptions,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircle, CreditCard, Download } from "lucide-react";
import dayjs from "dayjs";
import {
  listAdminSubscriptionPayments,
  markAdminSubscriptionPaymentPaid,
  type AdminSubscriptionPayment,
} from "@/api/backoffice";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { FilterBar } from "@/components/backoffice/FilterBar";
import { StatusTag } from "@/components/backoffice/StatusTag";
import { CopyIdentifier } from "@/components/backoffice/CopyIdentifier";
import { DetailsDrawer } from "@/components/backoffice/DetailsDrawer";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { formatAdminMoney } from "@/utils/adminMoney";
import { formatAdminDateTime } from "@/utils/adminPeriod";
import { buildPaymentCsv, downloadCsv } from "@/utils/adminCsv";
import styles from "./Backoffice.module.css";

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
  paydunya: "PayDunya",
};

const PROVIDER_LABEL: Record<string, string> = {
  paydunya: "PayDunya",
  wave: "Wave",
  orange_money: "Orange Money",
};

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
  const [providerFilter, setProviderFilter] = useState<string | undefined>(
    searchParams.get("provider") ?? undefined
  );
  const [channelFilter, setChannelFilter] = useState<string | undefined>(
    searchParams.get("channel") ?? undefined
  );
  const businessId = searchParams.get("businessId") ?? undefined;
  const [from, setFrom] = useState<string | undefined>(searchParams.get("from") ?? undefined);
  const [to, setTo] = useState<string | undefined>(searchParams.get("to") ?? undefined);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminSubscriptionPayment | null>(null);
  const [hasError, setHasError] = useState(false);

  const persistParams = (patch: Record<string, string | undefined>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const res = await listAdminSubscriptionPayments({
        page,
        size: pageSize,
        status: statusFilter,
        provider: providerFilter,
        channel: channelFilter,
        businessId,
        from,
        to,
      });
      setRows(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur de chargement");
      setHasError(true);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, providerFilter, channelFilter, businessId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    try {
      const res = await listAdminSubscriptionPayments({
        page: 0,
        size: 1000,
        status: statusFilter,
        provider: providerFilter,
        channel: channelFilter,
        businessId,
        from,
        to,
      });
      downloadCsv(
        `paiements-${new Date().toISOString().slice(0, 10)}.csv`,
        buildPaymentCsv(res.content ?? [])
      );
      message.success("Export CSV généré.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Export impossible.");
    }
  };

  const handleMarkPaid = (row: AdminSubscriptionPayment) => {
    let note = "";
    Modal.confirm({
      title: "Marquer ce paiement comme payé ?",
      content: (
        <div>
          <p>
            {row.businessName} — {row.planName} ({formatAdminMoney(row.amount, row.currency)})
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
          void load();
        } catch (e) {
          message.error(
            e instanceof Error ? e.message : "Le paiement n'a pas pu être récupéré. Réessayez."
          );
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
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/backoffice/businesses?highlight=${row.businessId}`);
          }}
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
      render: (n: number, row) => formatAdminMoney(n, row.currency),
    },
    {
      title: "Devise",
      dataIndex: "currency",
      width: 80,
    },
    {
      title: "Canal",
      dataIndex: "channel",
      render: (c: string) => CHANNEL_LABEL[c] || c,
    },
    {
      title: "Prestataire",
      dataIndex: "provider",
      render: (provider: string) => PROVIDER_LABEL[provider] || provider || "—",
    },
    {
      title: "Statut",
      dataIndex: "status",
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: "Facture",
      dataIndex: "invoiceNumber",
      render: (n?: string) => n || "—",
    },
    {
      title: "Réf. PSP",
      dataIndex: "externalRef",
      ellipsis: true,
      width: 140,
      render: (value?: string) => <CopyIdentifier value={value} label="référence prestataire" />,
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
            onClick={(event) => {
              event.stopPropagation();
              handleMarkPaid(row);
            }}
          >
            Marquer payé
          </Button>
        ) : null,
    },
  ];

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Paiements abonnements"
        subtitle="Intentions de paiement SaaS confirmées par le backend. Distinctes des ventes marchandes."
        extra={
          <Button icon={<Download size={16} />} onClick={() => void handleExport()}>
            Export CSV
          </Button>
        }
      />

      <Card variant="borderless" className={styles.tableCard}>
        <FilterBar>
          <Select
            allowClear
            placeholder="Statut"
            style={{ minWidth: 140, maxWidth: "100%" }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(0);
              persistParams({ status: v });
            }}
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            allowClear
            placeholder="Prestataire"
            style={{ minWidth: 150 }}
            value={providerFilter}
            onChange={(v) => {
              setProviderFilter(v);
              setPage(0);
              persistParams({ provider: v });
            }}
            options={Object.entries(PROVIDER_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            allowClear
            placeholder="Canal"
            style={{ minWidth: 150 }}
            value={channelFilter}
            onChange={(v) => {
              setChannelFilter(v);
              setPage(0);
              persistParams({ channel: v });
            }}
            options={Object.entries(CHANNEL_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <DatePicker.RangePicker
            value={from && to ? [dayjs(from), dayjs(to)] : null}
            onChange={(dates) => {
              const nextFrom = dates?.[0] ? dates[0].format("YYYY-MM-DD") : undefined;
              const nextTo = dates?.[1] ? dates[1].format("YYYY-MM-DD") : undefined;
              setFrom(nextFrom);
              setTo(nextTo);
              setPage(0);
              persistParams({ from: nextFrom, to: nextTo });
            }}
          />
          {businessId ? (
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
          ) : null}
        </FilterBar>

        {hasError ? (
          <ErrorState
            compact
            title="Impossible de charger les paiements"
            onRetry={() => void load()}
          />
        ) : (
          <div className="tableResponsive">
            <Table
              className="dataTable"
              rowKey="intentId"
              loading={loading}
              columns={columns}
              dataSource={rows}
              scroll={{ x: 1200 }}
              locale={{
                emptyText: (
                  <EmptyState
                    compact
                    icon={CreditCard}
                    title="Aucun paiement pour cette période"
                    description="Aucun intent d'abonnement ne correspond aux filtres."
                  />
                ),
              }}
              onRow={(record) => ({
                onClick: () => setDetail(record),
                style: { cursor: "pointer" },
              })}
              rowClassName={(record) =>
                record.intentId === searchParams.get("highlight") ? styles.highlightRow : ""
              }
              pagination={{
                current: page + 1,
                pageSize,
                total,
                showSizeChanger: true,
                onChange: (next, size) => {
                  setPage(next - 1);
                  setPageSize(size);
                },
              }}
            />
          </div>
        )}
      </Card>

      <DetailsDrawer
        title="Détail du paiement"
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Identifiant">
              <CopyIdentifier value={detail.intentId} label="identifiant interne" />
            </Descriptions.Item>
            <Descriptions.Item label="Entreprise">{detail.businessName}</Descriptions.Item>
            <Descriptions.Item label="Plan">
              {detail.planName || detail.planSlug} ({detail.billingCycle})
            </Descriptions.Item>
            <Descriptions.Item label="Montant">
              {formatAdminMoney(detail.amount, detail.currency)}
            </Descriptions.Item>
            <Descriptions.Item label="Canal">
              {CHANNEL_LABEL[detail.channel] || detail.channel}
            </Descriptions.Item>
            <Descriptions.Item label="Prestataire">
              {PROVIDER_LABEL[detail.provider] || detail.provider || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Statut">
              <StatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Facture">{detail.invoiceNumber || "—"}</Descriptions.Item>
            <Descriptions.Item label="Réf. prestataire">
              <CopyIdentifier value={detail.externalRef} />
            </Descriptions.Item>
            <Descriptions.Item label="Créé">
              {formatAdminDateTime(detail.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Payé">{formatAdminDateTime(detail.paidAt)}</Descriptions.Item>
            <Descriptions.Item label="Motif d'échec">
              {detail.failureReason || "—"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </DetailsDrawer>
    </div>
  );
}
