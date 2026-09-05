import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Select,
  DatePicker,
  Typography,
  Modal,
  message,
  Skeleton,
  Tooltip,
  Pagination,
} from "antd";
import { FileDown, Ban, Pencil, ListOrdered, Banknote, ShoppingBag } from "lucide-react";
import type { SalePaymentStatus, SaleResponse } from "@/api";
import { listSales, voidSale } from "@/api";
import { EmptyState } from "@/components/EmptyState";
import { RecordSalePaymentModal } from "@/components/RecordSalePaymentModal";
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { t } from "@/i18n";
import styles from "./Sales.module.css";
import type { Dayjs } from "dayjs";

type SalesView = "all" | "paid" | "partial" | "unpaid" | "voided";

const PAYMENT_LABELS: Record<string, string> = {
  cash: t.pos.cash,
  wave: t.pos.wave,
  orange_money: t.pos.orangeMoney,
  credit: t.pos.credit,
};

const VIEW_CHIPS: { id: SalesView; label: string }[] = [
  { id: "all", label: t.sales.filterAllSales },
  { id: "paid", label: t.sales.paymentStatusPaid },
  { id: "partial", label: t.sales.paymentStatusPartial },
  { id: "unpaid", label: t.sales.paymentStatusUnpaid },
  { id: "voided", label: t.sales.filterVoided },
];

function paymentStatusLabel(status: SalePaymentStatus | string | undefined): string {
  if (status === "partial") return t.sales.paymentStatusPartial;
  if (status === "unpaid") return t.sales.paymentStatusUnpaid;
  return t.sales.paymentStatusPaid;
}

function itemsCountLabel(sale: SaleResponse): string | null {
  const qty = (sale.lines ?? []).reduce((sum, line) => sum + line.quantity, 0);
  if (qty <= 0) return null;
  if (qty === 1) return t.sales.itemsCountOne;
  return t.sales.itemsCountOther.replace("{count}", String(qty));
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

function formatAmount(n: number) {
  return `${n.toLocaleString("fr-FR")} F`;
}

function formatDueDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

function salesCountLabel(count: number) {
  if (count === 1) return t.sales.countOne;
  return t.sales.countOther.replace("{count}", String(count));
}

function escapeCsvCell(v: string | number): string {
  const s = String(v);
  if (s.includes(";") || s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function viewToFilters(view: SalesView): {
  status?: string;
  paymentStatus?: SalePaymentStatus;
} {
  if (view === "voided") return { status: "voided" };
  if (view === "paid") return { status: "completed", paymentStatus: "paid" };
  if (view === "partial") return { status: "completed", paymentStatus: "partial" };
  if (view === "unpaid") return { status: "completed", paymentStatus: "unpaid" };
  return {};
}

function pillClass(sale: SaleResponse): string {
  if (sale.status === "voided") return styles.pillVoided;
  if (sale.paymentStatus === "partial") return styles.pillPartial;
  if (sale.paymentStatus === "unpaid") return styles.pillUnpaid;
  return styles.pillPaid;
}

function fillClass(sale: SaleResponse): string {
  if (sale.paymentStatus === "partial") return styles.fillPartial;
  if (sale.paymentStatus === "unpaid") return styles.fillUnpaid;
  return styles.fill;
}

type SaleRowProps = {
  sale: SaleResponse;
  showStore: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  voiding: boolean;
  onOpen: (sale: SaleResponse) => void;
  onCollect: (sale: SaleResponse) => void;
  onEdit: (sale: SaleResponse) => void;
  onVoid: (sale: SaleResponse, e: React.MouseEvent) => void;
};

function SaleRow({
  sale,
  showStore,
  canUpdate,
  canDelete,
  voiding,
  onOpen,
  onCollect,
  onEdit,
  onVoid,
}: SaleRowProps) {
  const isVoided = sale.status === "voided";
  const remaining = sale.remainingAmount ?? 0;
  const paid = sale.amountPaid ?? 0;
  const due = sale.dueDate ? formatDueDate(sale.dueDate) : "";
  const itemsLabel = itemsCountLabel(sale);
  const paidRatio = sale.total > 0 ? Math.min(100, Math.max(0, (paid / sale.total) * 100)) : 0;
  const meta = [
    itemsLabel,
    `${formatDate(sale.createdAt)} · ${formatTime(sale.createdAt)}`,
    showStore ? sale.storeName : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={`${styles.row} ${isVoided ? styles.rowVoided : ""}`}>
      <button
        type="button"
        className={styles.identity}
        onClick={() => onOpen(sale)}
        aria-label={(isVoided ? t.sales.openVoidedReceiptAria : t.sales.openReceiptAria).replace(
          "{ticket}",
          sale.receiptNumber
        )}
      >
        <span className={styles.ticket}>{sale.receiptNumber}</span>
        <span className={styles.meta}>{meta}</span>
      </button>

      <div className={styles.statusCol}>
        <span className={`${styles.pill} ${pillClass(sale)}`}>
          {isVoided ? t.sales.statusVoided : paymentStatusLabel(sale.paymentStatus)}
        </span>
        <span className={styles.method}>
          {isVoided
            ? t.sales.voidedStockRestored
            : (PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod)}
        </span>
      </div>

      <div className={styles.money}>
        <span className={styles.total}>{formatAmount(sale.total)}</span>
        {isVoided ? (
          <span className={styles.moneyMeta}>
            {t.sales.voidedNotInRevenue}
            {paid > 0 ? ` · ${t.sales.collectedBeforeVoid} ${formatAmount(paid)}` : ""}
          </span>
        ) : remaining > 0 ? (
          <>
            <div
              className={styles.track}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={sale.total}
              aria-valuenow={paid}
              aria-label={t.sales.collectedOfTotal
                .replace("{paid}", formatAmount(paid))
                .replace("{total}", formatAmount(sale.total))}
            >
              <div
                className={`${styles.fill} ${fillClass(sale)}`}
                style={{ width: `${paidRatio}%` }}
              />
            </div>
            <span className={styles.moneyMeta}>
              <span className={styles.remaining}>
                {t.sales.remainingDue} {formatAmount(remaining)}
              </span>
              {due ? ` · ${t.sales.dueOn.replace("{date}", due)}` : ""}
            </span>
          </>
        ) : null}
      </div>

      <div className={styles.actions}>
        {!isVoided && canUpdate && remaining > 0 ? (
          <Tooltip title={t.sales.recordPayment}>
            <Button
              type="primary"
              size="small"
              aria-label={t.sales.recordPayment}
              icon={<Banknote size={14} />}
              onClick={() => onCollect(sale)}
            >
              {t.sales.recordPayment}
            </Button>
          </Tooltip>
        ) : null}
        {!isVoided && canUpdate ? (
          <Tooltip title={t.sales.editSale}>
            <Button
              type="text"
              size="small"
              aria-label={t.sales.editSale}
              icon={<Pencil size={16} />}
              onClick={() => onEdit(sale)}
            />
          </Tooltip>
        ) : null}
        {!isVoided && canDelete ? (
          <Tooltip title={t.sales.voidSale}>
            <Button
              type="text"
              size="small"
              danger
              aria-label={t.sales.voidSale}
              icon={<Ban size={16} />}
              loading={voiding}
              onClick={(e) => onVoid(sale, e)}
            />
          </Tooltip>
        ) : null}
      </div>
    </li>
  );
}

export default function Sales() {
  const navigate = useNavigate();
  const { stores, activeStore } = useStore();
  const { matrixCan } = useMatrixCan();
  const canCreateSales = matrixCan("SALES_CREATE", "pos");
  const canUpdateSales = matrixCan("SALES_UPDATE", "pos");
  const canDeleteSales = matrixCan("SALES_DELETE", "pos");
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [view, setView] = useState<SalesView>("all");

  const [storeFilter, setStoreFilter] = useState<string | undefined>(
    () => activeStore?.id ?? undefined
  );
  useEffect(() => {
    const next = activeStore?.id ?? undefined;
    setStoreFilter((prev) => (prev !== next ? next : prev));
    setPage(0);
  }, [activeStore?.id]);

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [paymentSale, setPaymentSale] = useState<SaleResponse | null>(null);

  const { status: statusFilter, paymentStatus: paymentStatusFilter } = viewToFilters(view);

  const hasActiveFilters = Boolean(
    view !== "all" ||
    dateRange?.[0] ||
    dateRange?.[1] ||
    storeFilter !== (activeStore?.id ?? undefined)
  );

  const fetchSales = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!localStorage.getItem("ecom360_access_token")) {
        if (!isCancelled?.()) setLoading(false);
        return;
      }
      if (!isCancelled?.()) setLoading(true);
      try {
        const [start, end] = dateRange ?? [null, null];
        const res = await listSales({
          storeId: storeFilter || undefined,
          periodStart: start?.format("YYYY-MM-DD"),
          periodEnd: end?.format("YYYY-MM-DD"),
          status: statusFilter,
          paymentStatus: paymentStatusFilter,
          page,
          size: pageSize,
        });
        if (isCancelled?.()) return;
        setSales(res.content ?? []);
        setTotal(res.totalElements ?? 0);
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.sales.msgLoadError);
        setSales([]);
        setTotal(0);
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
      if (!canDeleteSales || sale.status !== "completed") return;
      Modal.confirm({
        title: t.sales.voidSale,
        content: t.sales.voidSaleConfirm,
        okText: t.sales.voidSaleOk,
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
    [canDeleteSales, fetchSales]
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
      escapeCsvCell(s.status === "voided" ? t.sales.statusVoided : t.sales.statusCompleted),
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
    setStoreFilter(activeStore?.id ?? undefined);
    setView("all");
    setDateRange(null);
    setPage(0);
  }, [activeStore?.id]);

  const openReceipt = useCallback(
    (sale: SaleResponse) => {
      navigate("/receipt", { state: { saleId: sale.id } });
    },
    [navigate]
  );

  const pageStats = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let remaining = 0;
    let openCount = 0;
    let voidedAmount = 0;
    let voidedCollected = 0;
    for (const sale of sales) {
      if (sale.status === "voided") {
        voidedAmount += sale.total;
        voidedCollected += sale.amountPaid ?? 0;
        continue;
      }
      billed += sale.total;
      collected += sale.amountPaid ?? 0;
      const due = sale.remainingAmount ?? 0;
      remaining += due;
      if (due > 0) openCount += 1;
    }
    return { billed, collected, remaining, openCount, voidedAmount, voidedCollected };
  }, [sales]);

  const showStore = stores.length > 1;
  const followUpLabel =
    pageStats.openCount === 1
      ? t.sales.openFollowUpOne.replace("{amount}", formatAmount(pageStats.remaining))
      : t.sales.openFollowUpOther
          .replace("{count}", String(pageStats.openCount))
          .replace("{amount}", formatAmount(pageStats.remaining));

  if (loading && sales.length === 0) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 140, height: 32 }} />
          <Skeleton.Button active style={{ width: 160, height: 40 }} />
        </div>
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <Typography.Title level={4} className="pageTitle">
            {t.sales.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="pageSubtitle">
            {salesCountLabel(total)}
          </Typography.Text>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<FileDown size={16} />} onClick={exportCsv} disabled={sales.length === 0}>
            {t.sales.exportCsv}
          </Button>
          {canCreateSales ? (
            <Button
              type="primary"
              icon={<ShoppingBag size={16} />}
              onClick={() => navigate("/pos")}
            >
              {t.sales.emptyCta}
            </Button>
          ) : null}
        </div>
      </header>

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        <div className={styles.toolbar}>
          <div className={styles.chips} role="group" aria-label={t.sales.filterByPaymentStatus}>
            {VIEW_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={view === chip.id}
                className={`${styles.chip} ${view === chip.id ? styles.chipActive : ""}`}
                onClick={() => {
                  setView(chip.id);
                  setPage(0);
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className={styles.toolbarMeta}>
            {showStore ? (
              <Select
                aria-label={t.sales.filterByStore}
                placeholder={t.sales.allStores}
                value={storeFilter}
                onChange={(v) => {
                  setStoreFilter(v ?? undefined);
                  setPage(0);
                }}
                allowClear
                popupMatchSelectWidth={false}
                className={styles.filterSelectWide}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
              />
            ) : null}
            <DatePicker.RangePicker
              aria-label={t.sales.filterByDate}
              value={dateRange ?? undefined}
              onChange={(range) => {
                setDateRange(range as [Dayjs | null, Dayjs | null] | null);
                setPage(0);
              }}
              format="DD/MM/YYYY"
              placeholder={[t.sales.dateStart, t.sales.dateEnd]}
              className={styles.dateRange}
            />
            {hasActiveFilters ? (
              <Button onClick={resetFilters}>{t.sales.resetFilters}</Button>
            ) : null}
          </div>
        </div>

        {sales.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            title={
              view === "voided"
                ? t.sales.emptyVoidedTitle
                : hasActiveFilters
                  ? t.sales.emptyFilteredTitle
                  : t.sales.emptyTitle
            }
            description={
              view === "voided"
                ? t.sales.emptyVoidedDesc
                : hasActiveFilters
                  ? t.sales.emptyFilteredDesc
                  : t.sales.emptyDesc
            }
            action={
              hasActiveFilters ? (
                <Button size="large" onClick={resetFilters}>
                  {t.sales.resetFilters}
                </Button>
              ) : canCreateSales ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<ShoppingBag size={16} />}
                  onClick={() => navigate("/pos")}
                  style={{ height: 48 }}
                >
                  {t.sales.emptyCta}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className={styles.stats} aria-label={t.sales.summaryPageHint}>
              {view === "voided" ? (
                <>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {formatAmount(pageStats.voidedAmount)}
                    </span>
                    <span className={styles.statLabel}>{t.sales.summaryVoidedAmount}</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {formatAmount(pageStats.voidedCollected)}
                    </span>
                    <span className={styles.statLabel}>{t.sales.collectedBeforeVoid}</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{salesCountLabel(total)}</span>
                    <span className={styles.statLabel}>{t.sales.voidedNotInRevenue}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{formatAmount(pageStats.billed)}</span>
                    <span className={styles.statLabel}>{t.sales.summaryBilled}</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{formatAmount(pageStats.collected)}</span>
                    <span className={styles.statLabel}>{t.sales.summaryCollected}</span>
                  </div>
                  <div
                    className={`${styles.stat} ${pageStats.remaining > 0 ? styles.statWarn : ""}`}
                  >
                    <span className={styles.statValue}>{formatAmount(pageStats.remaining)}</span>
                    <span className={styles.statLabel}>{t.sales.summaryOutstanding}</span>
                  </div>
                </>
              )}
            </div>
            {pageStats.openCount > 0 ? (
              <div className={styles.followUp}>{followUpLabel}</div>
            ) : null}
            <ul className={styles.list} aria-busy={loading}>
              {sales.map((sale) => (
                <SaleRow
                  key={sale.id}
                  sale={sale}
                  showStore={showStore}
                  canUpdate={canUpdateSales}
                  canDelete={canDeleteSales}
                  voiding={voidingId === sale.id}
                  onOpen={openReceipt}
                  onCollect={setPaymentSale}
                  onEdit={(next) => navigate(`/pos/edit/${next.id}`)}
                  onVoid={handleVoid}
                />
              ))}
            </ul>
            {total > pageSize ? (
              <div className={styles.pager}>
                <Pagination
                  current={page + 1}
                  pageSize={pageSize}
                  total={total}
                  showSizeChanger
                  pageSizeOptions={["10", "20", "50"]}
                  showTotal={(count) => salesCountLabel(count)}
                  onChange={(nextPage, nextSize) => {
                    setPage((nextPage ?? 1) - 1);
                    setPageSize(nextSize ?? 20);
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </Card>
      <RecordSalePaymentModal
        open={!!paymentSale}
        sale={paymentSale}
        onClose={() => setPaymentSale(null)}
        onRecorded={() => void fetchSales()}
      />
    </div>
  );
}
