import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, DatePicker, Descriptions, Input, Select, Table, message } from "antd";
import dayjs from "dayjs";
import { Download, Receipt } from "lucide-react";
import { listAdminInvoices, type AdminInvoice } from "@/api/backoffice";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { FilterBar } from "@/components/backoffice/FilterBar";
import { StatusTag } from "@/components/backoffice/StatusTag";
import { CopyIdentifier } from "@/components/backoffice/CopyIdentifier";
import { DetailsDrawer } from "@/components/backoffice/DetailsDrawer";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { formatAdminMoney } from "@/utils/adminMoney";
import { formatAdminDate } from "@/utils/adminPeriod";
import { buildInvoiceCsv, downloadCsv } from "@/utils/adminCsv";
import styles from "./Backoffice.module.css";

export default function BackofficeInvoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [rows, setRows] = useState<AdminInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>(searchParams.get("status") ?? undefined);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [searchDebounced, setSearchDebounced] = useState(search);
  const [from, setFrom] = useState<string | undefined>(searchParams.get("from") ?? undefined);
  const [to, setTo] = useState<string | undefined>(searchParams.get("to") ?? undefined);
  const [selected, setSelected] = useState<AdminInvoice | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchDebounced) next.set("search", searchDebounced);
    if (status) next.set("status", status);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    setSearchParams(next, { replace: true });
  }, [searchDebounced, status, from, to, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const res = await listAdminInvoices({
        page,
        size: pageSize,
        status,
        search: searchDebounced || undefined,
        from,
        to,
      });
      setRows(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch {
      setHasError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, searchDebounced, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    try {
      const res = await listAdminInvoices({
        page: 0,
        size: 1000,
        status,
        search: searchDebounced || undefined,
        from,
        to,
      });
      downloadCsv(
        `factures-${new Date().toISOString().slice(0, 10)}.csv`,
        buildInvoiceCsv(res.content ?? [])
      );
      message.success("Export CSV généré.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Export impossible.");
    }
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Factures d'abonnement"
        subtitle="Factures SaaS émises pour les entreprises. Distinctes des tickets de caisse marchands."
        extra={
          <Button icon={<Download size={16} />} onClick={() => void handleExport()}>
            Export CSV
          </Button>
        }
      />
      <Card variant="borderless" className={styles.card}>
        <FilterBar
          extra={
            <Button onClick={() => void load()} loading={loading}>
              Actualiser
            </Button>
          }
        >
          <Input.Search
            allowClear
            placeholder="Numéro de facture"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            style={{ width: 240 }}
          />
          <Select
            allowClear
            placeholder="Statut"
            style={{ width: 160 }}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
            options={[
              { value: "paid", label: "Payée" },
              { value: "draft", label: "Brouillon" },
              { value: "void", label: "Annulée" },
            ]}
          />
          <DatePicker.RangePicker
            value={from && to ? [dayjs(from), dayjs(to)] : null}
            onChange={(dates) => {
              setFrom(dates?.[0] ? dates[0].toISOString() : undefined);
              setTo(dates?.[1] ? dates[1].endOf("day").toISOString() : undefined);
              setPage(0);
            }}
          />
        </FilterBar>
        {hasError ? (
          <ErrorState
            compact
            title="Impossible de charger les factures"
            onRetry={() => void load()}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            scroll={{ x: 1080 }}
            onRow={(row) => ({
              onClick: () => setSelected(row),
              style: { cursor: "pointer" },
            })}
            rowClassName={(row) => {
              const highlight = searchParams.get("highlight") ?? searchDebounced;
              return highlight && (row.id === highlight || row.number === highlight)
                ? styles.highlightRow
                : "";
            }}
            locale={{
              emptyText: (
                <EmptyState
                  compact
                  icon={Receipt}
                  title="Aucune facture"
                  description="Aucune facture pour ces filtres."
                />
              ),
            }}
            columns={[
              { title: "N°", dataIndex: "number", key: "number" },
              {
                title: "Entreprise",
                dataIndex: "businessName",
                render: (name: string, row) => (
                  <Button
                    type="link"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/backoffice/businesses?highlight=${row.businessId}`);
                    }}
                  >
                    {name}
                  </Button>
                ),
              },
              {
                title: "Montant",
                render: (_, row) => formatAdminMoney(row.amount, row.currency),
              },
              {
                title: "Statut",
                dataIndex: "status",
                render: (value: string) => <StatusTag status={value} />,
              },
              {
                title: "Canal",
                dataIndex: "paymentMethod",
                render: (value: string | null) => value || "—",
              },
              {
                title: "Prestataire",
                dataIndex: "provider",
                render: (value: string | null) => value || "—",
              },
              { title: "Émise", dataIndex: "createdAt", render: formatAdminDate },
              { title: "Échéance", dataIndex: "dueDate", render: formatAdminDate },
              { title: "Payée le", dataIndex: "paidAt", render: formatAdminDate },
              {
                title: "Réf. prestataire",
                dataIndex: "externalRef",
                render: (value: string) => <CopyIdentifier value={value} />,
              },
            ]}
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
        )}
      </Card>
      <DetailsDrawer
        title={selected ? `Facture ${selected.number}` : "Facture"}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Entreprise">{selected.businessName}</Descriptions.Item>
            <Descriptions.Item label="Montant">
              {formatAdminMoney(selected.amount, selected.currency)}
            </Descriptions.Item>
            <Descriptions.Item label="Statut">
              <StatusTag status={selected.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Canal">{selected.paymentMethod || "—"}</Descriptions.Item>
            <Descriptions.Item label="Prestataire">{selected.provider || "—"}</Descriptions.Item>
            <Descriptions.Item label="Intent">
              <CopyIdentifier value={selected.paymentIntentId} />
            </Descriptions.Item>
            <Descriptions.Item label="Réf. prestataire">
              <CopyIdentifier value={selected.externalRef} />
            </Descriptions.Item>
            <Descriptions.Item label="Émise">
              {formatAdminDate(selected.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Échéance">
              {formatAdminDate(selected.dueDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Payée le">
              {formatAdminDate(selected.paidAt)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </DetailsDrawer>
    </div>
  );
}
