import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Card,
  Button,
  Typography,
  Skeleton,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  message,
  Pagination,
} from "antd";
import { Plus, ClipboardList, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import { t } from "@/i18n";
import styles from "./Clients.module.css";
import {
  listPurchaseOrders,
  createPurchaseOrder,
  listSuppliers,
  listStores,
  listProducts,
  type PurchaseOrderResponse,
  type PurchaseOrderStatus,
  type SupplierResponse,
  type StoreResponse,
  type ProductResponse,
} from "@/api";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { EmptyState } from "@/components/EmptyState";

const STATUS_CHIPS: { id: "all" | PurchaseOrderStatus; label: string }[] = [
  { id: "all", label: t.purchaseOrders.filterAll },
  { id: "draft", label: t.purchaseOrders.status.draft },
  { id: "ordered", label: t.purchaseOrders.status.ordered },
  { id: "received", label: t.purchaseOrders.status.received },
  { id: "cancelled", label: t.purchaseOrders.status.cancelled },
];

function formatFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " F";
}

function statusLabel(status: string): string {
  const map = t.purchaseOrders.status as Record<string, string>;
  return map[status] ?? status;
}

function statusPillClass(status: string): string {
  if (status === "ordered") return styles.pillWarn;
  if (status === "received") return styles.pillOk;
  if (status === "cancelled") return styles.pillDanger;
  return styles.pillMuted;
}

function purchaseOrdersCountLabel(count: number) {
  if (count === 1) return t.purchaseOrders.countOne;
  return t.purchaseOrders.countOther.replace("{count}", String(count));
}

function linesCountLabel(count: number) {
  if (count === 1) return t.purchaseOrders.linesCountOne;
  return t.purchaseOrders.linesCountOther.replace("{count}", String(count));
}

type LineForm = {
  productId?: string;
  quantity?: number;
  unitCost?: number;
};

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supplierFilter = searchParams.get("supplierId") ?? undefined;
  const { matrixCan } = useMatrixCan();

  const [rows, setRows] = useState<PurchaseOrderResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);

  const canCreate = matrixCan("PURCHASE_ORDERS_CREATE", "purchaseOrders");

  const supplierNameById = useMemo(() => {
    const m = new Map<string, string>();
    suppliers.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [suppliers]);

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [stores]);

  const fetchList = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!localStorage.getItem("ecom360_access_token")) {
        if (!isCancelled?.()) setLoading(false);
        return;
      }
      if (!isCancelled?.()) setLoading(true);
      try {
        const res = await listPurchaseOrders({
          page,
          size: pageSize,
          status: statusFilter,
          supplierId: supplierFilter,
        });
        if (isCancelled?.()) return;
        setRows(res.content ?? []);
        setTotal(res.totalElements ?? 0);
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setRows([]);
        setTotal(0);
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [page, pageSize, statusFilter, supplierFilter]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchList(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchList]);

  useEffect(() => {
    Promise.all([
      listSuppliers({ page: 0, size: 100 }),
      listStores(),
      listProducts({ page: 0, size: 200 }),
    ])
      .then(([supRes, storeRes, prodRes]) => {
        setSuppliers(supRes.content ?? []);
        setStores(storeRes ?? []);
        setProducts((prodRes.content ?? []).filter((p) => p.isActive));
      })
      .catch(() => {
        /* ignore — create modal will show empty selects */
      });
  }, []);

  const pageStats = useMemo(() => {
    let dueCount = 0;
    let dueAmount = 0;
    for (const row of rows) {
      if (row.status === "received" && row.remainingAmount > 0) {
        dueCount += 1;
        dueAmount += row.remainingAmount;
      }
    }
    return { dueCount, dueAmount };
  }, [rows]);

  const hasActiveFilters = !!statusFilter || !!supplierFilter;
  const isCatalogEmpty = rows.length === 0 && !hasActiveFilters;

  const resetFilters = () => {
    setStatusFilter(undefined);
    setPage(0);
    if (supplierFilter) navigate("/purchase-orders");
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      supplierId: supplierFilter,
      storeId: stores[0]?.id,
      lines: [{ quantity: 1, unitCost: 0 }],
    });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const lines = (values.lines as LineForm[]).filter((l) => l.productId);
      if (lines.length === 0) {
        message.error(t.purchaseOrders.msgLinesRequired);
        return;
      }
      setCreating(true);
      const po = await createPurchaseOrder({
        supplierId: values.supplierId,
        storeId: values.storeId,
        expectedDate: values.expectedDate ? dayjs(values.expectedDate).format("YYYY-MM-DD") : null,
        note: values.note || null,
        lines: lines.map((l) => ({
          productId: l.productId!,
          quantity: Number(l.quantity) || 1,
          unitCost: Number(l.unitCost) || 0,
        })),
      });
      message.success(t.purchaseOrders.msgCreated.replace("{ref}", po.reference));
      setCreateOpen(false);
      navigate(`/purchase-orders/${po.id}`);
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setCreating(false);
    }
  };

  if (loading && rows.length === 0 && !hasActiveFilters) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 180, height: 28 }} />
          <div className={styles.toolbar}>
            <Skeleton.Button active style={{ width: 160, height: 44 }} />
          </div>
        </div>
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <Typography.Title level={4} className="pageTitle">
            {t.purchaseOrders.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="pageSubtitle">
            {purchaseOrdersCountLabel(total)}
          </Typography.Text>
        </div>
        <div className={styles.headerActions}>
          {canCreate ? (
            <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
              {t.purchaseOrders.create}
            </Button>
          ) : null}
        </div>
      </header>

      {supplierFilter ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {t.purchaseOrders.filteredBySupplier}{" "}
          <Link to={`/suppliers/${supplierFilter}`}>
            {supplierNameById.get(supplierFilter) ?? supplierFilter.slice(0, 8)}
          </Link>
          {" · "}
          <Link to="/purchase-orders">{t.purchaseOrders.clearFilter}</Link>
        </Typography.Paragraph>
      ) : null}

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {isCatalogEmpty ? null : (
          <div className={styles.toolbar}>
            <div className={styles.chips} role="group">
              {STATUS_CHIPS.map((chip) => {
                const pressed = chip.id === "all" ? !statusFilter : statusFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={pressed}
                    className={`${styles.chip} ${pressed ? styles.chipActive : ""}`}
                    onClick={() => {
                      setStatusFilter(chip.id === "all" ? undefined : chip.id);
                      setPage(0);
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            {hasActiveFilters ? (
              <Button onClick={resetFilters}>{t.list.resetFilters}</Button>
            ) : null}
          </div>
        )}

        {isCatalogEmpty ? (
          <EmptyState
            icon={ClipboardList}
            title={t.purchaseOrders.emptyTitle}
            description={t.purchaseOrders.emptyDesc}
            action={
              canCreate ? (
                <Button type="primary" icon={<Plus size={18} />} onClick={openCreate}>
                  {t.purchaseOrders.emptyCta}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {rows.length > 0 ? (
              <>
                <div className={styles.stats} aria-label={t.list.summaryPageHint}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {purchaseOrdersCountLabel(rows.length)}
                    </span>
                    <span className={styles.statLabel}>{t.list.summaryPageHint}</span>
                  </div>
                  <div className={`${styles.stat} ${pageStats.dueCount > 0 ? styles.statWarn : ""}`}>
                    <span className={styles.statValue}>{pageStats.dueCount}</span>
                    <span className={styles.statLabel}>{t.purchaseOrders.outstandingOrders}</span>
                  </div>
                  <div
                    className={`${styles.stat} ${pageStats.dueAmount > 0 ? styles.statWarn : ""}`}
                  >
                    <span className={styles.statValue}>{formatFCFA(pageStats.dueAmount)}</span>
                    <span className={styles.statLabel}>{t.purchaseOrders.remainingDue}</span>
                  </div>
                </div>
                {pageStats.dueCount > 0 && !statusFilter ? (
                  <div className={styles.followUp}>
                    {(pageStats.dueCount === 1
                      ? t.purchaseOrders.dueFollowUpOne
                      : t.purchaseOrders.dueFollowUpOther
                    )
                      .replace("{count}", String(pageStats.dueCount))
                      .replace("{amount}", formatFCFA(pageStats.dueAmount))}
                  </div>
                ) : null}
              </>
            ) : null}
            {rows.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t.list.emptyFilteredTitle}
                description={t.list.emptyFilteredDesc}
                action={
                  <Button size="large" onClick={resetFilters}>
                    {t.list.resetFilters}
                  </Button>
                }
              />
            ) : (
              <ul className={styles.list} aria-busy={loading}>
                {rows.map((row) => {
                  const remaining = row.remainingAmount ?? 0;
                  const due = row.status === "received" && remaining > 0;
                  const expected = row.expectedDate
                    ? dayjs(row.expectedDate).format("DD/MM/YYYY")
                    : null;
                  const lineCount = row.lines?.length ?? 0;
                  const meta = [
                    supplierNameById.get(row.supplierId) ?? null,
                    storeNameById.get(row.storeId) ?? null,
                    expected,
                    lineCount > 0 ? linesCountLabel(lineCount) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={row.id}
                      className={`${styles.row} ${due ? styles.rowDue : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.identity}
                        onClick={() => navigate(`/purchase-orders/${row.id}`)}
                        aria-label={t.purchaseOrders.openAria.replace("{ref}", row.reference)}
                      >
                        <span className={styles.identityText}>
                          <span className={styles.name}>{row.reference}</span>
                          {meta ? <span className={styles.meta}>{meta}</span> : null}
                        </span>
                      </button>
                      <div className={styles.statusCol}>
                        <span className={`${styles.pill} ${statusPillClass(row.status)}`}>
                          {statusLabel(row.status)}
                        </span>
                      </div>
                      <div className={`${styles.money} ${styles.actions}`}>
                        <span className={styles.identityText}>
                          <span className={styles.total}>{formatFCFA(row.totalAmount)}</span>
                          {remaining > 0 ? (
                            <span className={styles.meta}>
                              {t.purchaseOrders.remainingDue} {formatFCFA(remaining)}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {total > pageSize ? (
              <div className={styles.pager}>
                <Pagination
                  current={page + 1}
                  pageSize={pageSize}
                  total={total}
                  showSizeChanger
                  pageSizeOptions={["10", "20", "50"]}
                  showTotal={(count) => purchaseOrdersCountLabel(count)}
                  onChange={(nextPage, size) => {
                    setPage(nextPage - 1);
                    setPageSize(size);
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Modal
        title={t.purchaseOrders.create}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText={t.common.confirm}
        cancelText={t.common.cancel}
        confirmLoading={creating}
        width="min(720px, calc(100vw - 32px))"
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="supplierId"
            label={t.purchaseOrders.supplier}
            rules={[{ required: true, message: t.purchaseOrders.supplierRequired }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={t.purchaseOrders.supplier}
            />
          </Form.Item>
          <Form.Item
            name="storeId"
            label={t.purchaseOrders.store}
            rules={[{ required: true, message: t.purchaseOrders.storeRequired }]}
          >
            <Select
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={t.purchaseOrders.store}
            />
          </Form.Item>
          <Form.Item name="expectedDate" label={t.purchaseOrders.expectedDate}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t.purchaseOrders.note}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
            {t.purchaseOrders.lines}
          </Typography.Text>
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <div key={field.key} className={styles.poLineRow}>
                    <Form.Item
                      {...field}
                      name={[field.name, "productId"]}
                      rules={[
                        {
                          required: true,
                          message: t.purchaseOrders.productRequired,
                        },
                      ]}
                      className={styles.poLineProduct}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder={t.purchaseOrders.product}
                        style={{ width: "100%" }}
                        options={products.map((p) => ({
                          value: p.id,
                          label: `${p.name}${p.sku ? ` (${p.sku})` : ""}`,
                        }))}
                        onChange={(productId) => {
                          const p = products.find((x) => x.id === productId);
                          if (p) {
                            const lines = form.getFieldValue("lines") as LineForm[];
                            const next = [...lines];
                            next[field.name] = {
                              ...next[field.name],
                              productId,
                              unitCost: p.costPrice ?? 0,
                            };
                            form.setFieldsValue({ lines: next });
                          }
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "quantity"]}
                      rules={[{ required: true }]}
                      className={styles.poLineQty}
                    >
                      <InputNumber
                        min={1}
                        placeholder={t.purchaseOrders.qty}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "unitCost"]}
                      rules={[{ required: true }]}
                      className={styles.poLineCost}
                    >
                      <InputNumber
                        min={0}
                        placeholder={t.purchaseOrders.unitCost}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={16} />}
                        onClick={() => remove(field.name)}
                        aria-label={t.common.delete}
                      />
                    )}
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ quantity: 1, unitCost: 0 })} block>
                  {t.purchaseOrders.addLine}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
