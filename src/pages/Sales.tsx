import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Select,
  DatePicker,
  Space,
  Tag,
  Modal,
  message,
  Skeleton,
} from "antd";
import { FileDown, Ban, Pencil, ListOrdered, Banknote, Search } from "lucide-react";
import type { SalePaymentStatus, SaleResponse } from "@/api";
import { listSales, voidSale } from "@/api";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, PageShell } from "@/components/ui";
import { RecordSalePaymentModal } from "@/components/RecordSalePaymentModal";
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { t } from "@/i18n";
import styles from "./Sales.module.css";
import type { Dayjs } from "dayjs";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  credit: "Crédit",
};

const PAYMENT_STATUS_COLORS: Record<SalePaymentStatus, string> = {
  paid: "green",
  partial: "gold",
  unpaid: "purple",
};

function paymentStatusLabel(status: SalePaymentStatus | string | undefined): string {
  if (status === "partial") return t.sales.paymentStatusPartial;
  if (status === "unpaid") return t.sales.paymentStatusUnpaid;
  return t.sales.paymentStatusPaid;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function escapeCsvCell(v: string | number): string {
  const s = String(v);
  if (s.includes(";") || s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function Sales() {
  const navigate = useNavigate();
  const { stores, activeStore } = useStore();
  const { matrixCan } = useMatrixCan();
  const canUpdateSales = matrixCan("SALES_UPDATE", "pos");
  const canDeleteSales = matrixCan("SALES_DELETE", "pos");
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  // Filtre boutique synchronisé avec la boutique active (une seule source de vérité)
  const [storeFilter, setStoreFilter] = useState<string | undefined>(
    () => activeStore?.id ?? undefined
  );
  useEffect(() => {
    const next = activeStore?.id ?? undefined;
    setStoreFilter((prev) => (prev !== next ? next : prev));
    setPage(0);
  }, [activeStore?.id]);

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<SalePaymentStatus | undefined>(
    undefined
  );
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [paymentSale, setPaymentSale] = useState<SaleResponse | null>(null);

  const fetchSales = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!localStorage.getItem("ecom360_access_token")) {
        if (!isCancelled?.()) {
          setLoading(false);
          setHasLoaded(true);
        }
        return;
      }
      if (!isCancelled?.()) setLoading(true);
      try {
        const [start, end] = dateRange ?? [null, null];
        const res = await listSales({
          storeId: storeFilter || undefined,
          periodStart: start?.format("YYYY-MM-DD"),
          periodEnd: end?.format("YYYY-MM-DD"),
          status: statusFilter || undefined,
          paymentStatus: paymentStatusFilter,
          page,
          size: pageSize,
        });
        if (isCancelled?.()) return;
        setSales(res.content ?? []);
        setTotal(res.totalElements ?? 0);
        if (!isCancelled?.()) setHasLoaded(true);
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.sales.msgLoadError);
        setSales([]);
        setTotal(0);
        setHasLoaded(true);
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [storeFilter, statusFilter, paymentStatusFilter, dateRange, page, pageSize]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchSales(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchSales]);

  const handleVoid = useCallback(
    (sale: SaleResponse, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!matrixCan("SALES_DELETE", "pos") || sale.status !== "completed") return;
      Modal.confirm({
        title: t.sales.voidSale,
        content: t.sales.voidSaleConfirm,
        okText: t.sales.voidSale,
        okType: "danger",
        cancelText: t.common.cancel,
        onOk: async () => {
          setVoidingId(sale.id);
          try {
            await voidSale(sale.id);
            message.success(t.sales.saleCancelled);
            fetchSales();
          } catch (err) {
            message.error(err instanceof Error ? err.message : t.sales.cancelSaleFailed);
          } finally {
            setVoidingId(null);
          }
        },
      });
    },
    [matrixCan, fetchSales]
  );

  const exportCsv = useCallback(() => {
    const headers = [
      "N° ticket",
      "Date",
      "Heure",
      "Boutique",
      "Montant (F)",
      "Encaissé (F)",
      "Reste dû (F)",
      "Paiement",
      "Règlement",
      "Statut",
    ];
    const rows = sales.map((s) => [
      escapeCsvCell(s.receiptNumber),
      escapeCsvCell(formatDate(s.createdAt)),
      escapeCsvCell(formatTime(s.createdAt)),
      escapeCsvCell(s.storeName ?? ""),
      escapeCsvCell(s.total),
      escapeCsvCell(s.amountPaid ?? 0),
      escapeCsvCell(s.remainingAmount ?? 0),
      escapeCsvCell(PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod),
      escapeCsvCell(paymentStatusLabel(s.paymentStatus)),
      escapeCsvCell(s.status === "voided" ? "Annulée" : "Terminée"),
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(t.sales.exportReady);
  }, [sales]);

  const resetFilters = useCallback(() => {
    setStoreFilter(undefined);
    setStatusFilter(undefined);
    setPaymentStatusFilter(undefined);
    setDateRange(null);
    setPage(0);
  }, []);

  const headerActions = (
    <Button icon={<FileDown size={16} />} onClick={exportCsv} disabled={sales.length === 0}>
      {t.sales.exportCsv}
    </Button>
  );

  const filterBar = (
    <div className={styles.toolbar}>
      <Space wrap size="middle">
        <Select
          placeholder={t.sales.filterByStore}
          value={storeFilter}
          onChange={(v) => {
            setStoreFilter(v ?? undefined);
            setPage(0);
          }}
          allowClear
          style={{ width: 180 }}
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          placeholder={t.sales.filterByStatus}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v ?? undefined);
            setPage(0);
          }}
          allowClear
          style={{ width: 140 }}
          options={[
            { value: "completed", label: t.sales.statusCompleted },
            { value: "voided", label: t.sales.statusVoided },
          ]}
        />
        <Select
          placeholder={t.sales.filterByPaymentStatus}
          value={paymentStatusFilter}
          onChange={(v) => {
            setPaymentStatusFilter((v as SalePaymentStatus | undefined) ?? undefined);
            setPage(0);
          }}
          allowClear
          style={{ width: 150 }}
          options={[
            { value: "paid", label: t.sales.paymentStatusPaid },
            { value: "partial", label: t.sales.paymentStatusPartial },
            { value: "unpaid", label: t.sales.paymentStatusUnpaid },
          ]}
        />
        <DatePicker.RangePicker
          value={dateRange ?? undefined}
          onChange={(range) => {
            setDateRange(range as [Dayjs | null, Dayjs | null] | null);
            setPage(0);
          }}
          format="DD/MM/YYYY"
        />
        <Button onClick={resetFilters}>{t.sales.resetFilters}</Button>
      </Space>
    </div>
  );

  const isCatalogEmpty =
    sales.length === 0 && !statusFilter && !paymentStatusFilter && !dateRange;

  if (!hasLoaded && loading) {
    return (
      <PageShell className={styles.page}>
        <PageHeader title={t.sales.title} actions={headerActions} />
        {filterBar}
        <Card variant="borderless" className={styles.card}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell className={styles.page}>
      <PageHeader title={t.sales.title} actions={headerActions} />
      {filterBar}

      <Card variant="borderless" className={styles.card}>
        {isCatalogEmpty ? (
          <EmptyState
            icon={ListOrdered}
            title={t.sales.emptyTitle}
            description={t.sales.emptyDesc}
            action={
              <Button
                type="primary"
                size="large"
                onClick={() => navigate("/pos")}
                style={{ height: 48 }}
              >
                {t.sales.emptyCta}
              </Button>
            }
          />
        ) : sales.length === 0 ? (
          <EmptyState compact icon={Search} title={t.sales.emptySearch} />
        ) : (
          <div className="tableResponsive">
            <Table
              className="dataTable"
              dataSource={sales}
              rowKey="id"
              loading={loading}
              scroll={{ x: "max-content" }}
              pagination={{
                current: page + 1,
                pageSize,
                total,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50"],
                showTotal: (n) => t.sales.showTotal.replace("{count}", String(n)),
                onChange: (p, s) => {
                  setPage((p ?? 1) - 1);
                  setPageSize(s ?? 20);
                },
              }}
              onRow={(record) => ({
                style: { cursor: "pointer" },
                onClick: () => navigate("/receipt", { state: { saleId: record.id } }),
              })}
              columns={[
                {
                  title: t.sales.receiptNumber,
                  dataIndex: "receiptNumber",
                  width: 140,
                },
                {
                  title: t.receipt.dateTime,
                  width: 140,
                  render: (_: unknown, r: SaleResponse) => (
                    <span>
                      {formatDate(r.createdAt)} {formatTime(r.createdAt)}
                    </span>
                  ),
                },
                {
                  title: t.stores.title,
                  dataIndex: "storeName",
                  width: 140,
                },
                {
                  title: t.common.total,
                  dataIndex: "total",
                  width: 110,
                  align: "right",
                  render: (v: number) => (
                    <span className={styles.amount}>{v.toLocaleString("fr-FR")} F</span>
                  ),
                },
                {
                  title: t.sales.remainingDue,
                  dataIndex: "remainingAmount",
                  width: 110,
                  align: "right",
                  render: (v: number, r: SaleResponse) =>
                    r.status === "completed" && v > 0 ? (
                      <span className={styles.amount}>{v.toLocaleString("fr-FR")} F</span>
                    ) : (
                      <span className={styles.amount}>—</span>
                    ),
                },
                {
                  title: "Paiement",
                  dataIndex: "paymentMethod",
                  width: 110,
                  render: (m: string) => (
                    <Tag
                      color={
                        m === "wave"
                          ? "processing"
                          : m === "orange_money"
                            ? "warning"
                            : m === "credit"
                              ? "purple"
                              : "default"
                      }
                    >
                      {PAYMENT_LABELS[m] ?? m}
                    </Tag>
                  ),
                },
                {
                  title: t.sales.filterByPaymentStatus,
                  dataIndex: "paymentStatus",
                  width: 110,
                  render: (status: SalePaymentStatus, r: SaleResponse) =>
                    r.status === "voided" ? (
                      <Tag>{t.sales.statusVoided}</Tag>
                    ) : (
                      <Tag color={PAYMENT_STATUS_COLORS[status] ?? "default"}>
                        {paymentStatusLabel(status)}
                      </Tag>
                    ),
                },
                {
                  title: t.sales.filterByStatus,
                  dataIndex: "status",
                  width: 100,
                  render: (status: string) => (
                    <Tag color={status === "voided" ? "default" : "green"}>
                      {status === "voided" ? t.sales.statusVoided : t.sales.statusCompleted}
                    </Tag>
                  ),
                },
                ...(canUpdateSales || canDeleteSales
                  ? [
                      {
                        title: "",
                        key: "actions",
                        width: 280,
                        render: (_: unknown, r: SaleResponse) =>
                          r.status === "completed" ? (
                            <Space size={4} wrap>
                              {canUpdateSales && r.remainingAmount > 0 && (
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<Banknote size={14} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentSale(r);
                                  }}
                                >
                                  {t.sales.recordPayment}
                                </Button>
                              )}
                              {canUpdateSales && (
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<Pencil size={14} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/pos/edit/${r.id}`);
                                  }}
                                >
                                  {t.sales.editSale}
                                </Button>
                              )}
                              {canDeleteSales && (
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<Ban size={14} />}
                                  loading={voidingId === r.id}
                                  onClick={(e) => handleVoid(r, e)}
                                >
                                  Annuler
                                </Button>
                              )}
                            </Space>
                          ) : null,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        )}
      </Card>
      <RecordSalePaymentModal
        open={!!paymentSale}
        sale={paymentSale}
        onClose={() => setPaymentSale(null)}
        onRecorded={() => void fetchSales()}
      />
    </PageShell>
  );
}
