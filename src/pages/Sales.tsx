import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Select,
  DatePicker,
  Space,
  Typography,
  Tag,
  Modal,
  message,
  Skeleton,
} from "antd";
import { FileDown, Ban } from "lucide-react";
import type { SaleResponse } from "@/api";
import { listSales, voidSale } from "@/api";
import { useStore } from "@/hooks/useStore";
import { usePermissions } from "@/hooks/usePermissions";
import { t } from "@/i18n";
import styles from "./Sales.module.css";
import type { Dayjs } from "dayjs";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  credit: "Crédit",
};

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
  const { can } = usePermissions();
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
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
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const fetchSales = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [start, end] = dateRange ?? [null, null];
      const res = await listSales({
        storeId: storeFilter || undefined,
        periodStart: start?.format("YYYY-MM-DD"),
        periodEnd: end?.format("YYYY-MM-DD"),
        status: statusFilter || undefined,
        page,
        size: pageSize,
      });
      setSales(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement ventes");
      setSales([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [storeFilter, statusFilter, dateRange, page, pageSize]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleVoid = useCallback(
    (sale: SaleResponse, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!can("SALES_DELETE") || sale.status !== "completed") return;
      Modal.confirm({
        title: t.sales.voidSale,
        content:
          "La vente sera annulée : le stock sera recrédité et le crédit client (si applicable) sera déduit. Cette action est irréversible.",
        okText: t.sales.voidSale,
        okType: "danger",
        cancelText: t.common.cancel,
        onOk: async () => {
          setVoidingId(sale.id);
          try {
            await voidSale(sale.id);
            message.success("Vente annulée");
            fetchSales();
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Impossible d'annuler");
          } finally {
            setVoidingId(null);
          }
        },
      });
    },
    [can, fetchSales]
  );

  const exportCsv = useCallback(() => {
    const headers = ["N° ticket", "Date", "Heure", "Boutique", "Montant (F)", "Paiement", "Statut"];
    const rows = sales.map((s) => [
      escapeCsvCell(s.receiptNumber),
      escapeCsvCell(formatDate(s.createdAt)),
      escapeCsvCell(formatTime(s.createdAt)),
      escapeCsvCell(s.storeName ?? ""),
      escapeCsvCell(s.total),
      escapeCsvCell(PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod),
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
    message.success("Export téléchargé");
  }, [sales]);

  const resetFilters = useCallback(() => {
    setStoreFilter(undefined);
    setStatusFilter(undefined);
    setDateRange(null);
    setPage(0);
  }, []);

  if (loading && sales.length === 0) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 120, height: 32 }} />
          <Skeleton.Button active style={{ width: 200, height: 44 }} />
        </div>
        <Card variant="borderless" className={styles.card}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <Typography.Title level={4} className="pageTitle" style={{ margin: 0 }}>
          {t.sales.title}
        </Typography.Title>
        <Button icon={<FileDown size={16} />} onClick={exportCsv} disabled={sales.length === 0}>
          Export CSV
        </Button>
      </header>

      <div className={styles.filters}>
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
          <DatePicker.RangePicker
            value={dateRange ?? undefined}
            onChange={(range) => {
              setDateRange(range as [Dayjs | null, Dayjs | null] | null);
              setPage(0);
            }}
            format="DD/MM/YYYY"
          />
          <Button onClick={resetFilters}>Réinitialiser</Button>
        </Space>
      </div>

      <Card variant="borderless" className={styles.card}>
        {sales.length === 0 ? (
          <div className={styles.emptyHero}>
            <Typography.Title level={4}>{t.sales.emptyTitle}</Typography.Title>
            <Typography.Text type="secondary">{t.sales.emptyDesc}</Typography.Text>
          </div>
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={sales}
              rowKey="id"
              loading={loading}
              pagination={{
                current: page + 1,
                pageSize,
                total,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50"],
                showTotal: (t) => `${t} vente${t > 1 ? "s" : ""}`,
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
                  title: t.sales.filterByStatus,
                  dataIndex: "status",
                  width: 100,
                  render: (status: string) => (
                    <Tag color={status === "voided" ? "default" : "green"}>
                      {status === "voided" ? t.sales.statusVoided : t.sales.statusCompleted}
                    </Tag>
                  ),
                },
                ...(can("SALES_DELETE")
                  ? [
                      {
                        title: "",
                        key: "actions",
                        width: 120,
                        render: (_: unknown, r: SaleResponse) =>
                          r.status === "completed" ? (
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
                          ) : null,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
