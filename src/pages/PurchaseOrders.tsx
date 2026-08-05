import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Skeleton,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Space,
  message,
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

const STATUS_COLOR: Record<string, string> = {
  draft: "default",
  ordered: "processing",
  received: "success",
  cancelled: "error",
};

function formatFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " F";
}

function statusLabel(status: string): string {
  const map = t.purchaseOrders.status as Record<string, string>;
  return map[status] ?? status;
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

  if (loading && rows.length === 0) {
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
        <Typography.Title level={4} className="pageTitle">
          {t.purchaseOrders.title}
        </Typography.Title>
        <div className={styles.toolbar}>
          <Select
            allowClear
            placeholder={t.purchaseOrders.filterStatus}
            style={{ minWidth: 160 }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(0);
            }}
            options={(["draft", "ordered", "received", "cancelled"] as PurchaseOrderStatus[]).map(
              (s) => ({ value: s, label: statusLabel(s) })
            )}
          />
          {matrixCan("PURCHASE_ORDERS_CREATE", "purchaseOrders") && (
            <Button type="primary" icon={<Plus size={18} />} onClick={openCreate}>
              {t.purchaseOrders.create}
            </Button>
          )}
        </div>
      </header>

      {supplierFilter && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {t.purchaseOrders.filteredBySupplier}{" "}
          <Link to={`/suppliers/${supplierFilter}`}>
            {supplierNameById.get(supplierFilter) ?? supplierFilter.slice(0, 8)}
          </Link>
          {" · "}
          <Link to="/purchase-orders">{t.purchaseOrders.clearFilter}</Link>
        </Typography.Paragraph>
      )}

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t.purchaseOrders.emptyTitle}
            description={t.purchaseOrders.emptyDesc}
            action={
              matrixCan("PURCHASE_ORDERS_CREATE", "purchaseOrders") ? (
                <Button type="primary" icon={<Plus size={18} />} onClick={openCreate}>
                  {t.purchaseOrders.emptyCta}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
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
            onRow={(r) => ({
              onClick: () => navigate(`/purchase-orders/${r.id}`),
              style: { cursor: "pointer" },
            })}
            columns={[
              {
                title: t.purchaseOrders.reference,
                dataIndex: "reference",
                render: (ref: string) => <Typography.Text strong>{ref}</Typography.Text>,
              },
              {
                title: t.purchaseOrders.supplier,
                dataIndex: "supplierId",
                render: (id: string) => supplierNameById.get(id) ?? "—",
              },
              {
                title: t.purchaseOrders.store,
                dataIndex: "storeId",
                render: (id: string) => storeNameById.get(id) ?? "—",
              },
              {
                title: t.purchaseOrders.statusColumn,
                dataIndex: "status",
                render: (s: string) => (
                  <Tag color={STATUS_COLOR[s] || "default"}>{statusLabel(s)}</Tag>
                ),
              },
              {
                title: t.purchaseOrders.total,
                dataIndex: "totalAmount",
                align: "right",
                render: (n: number) => formatFCFA(n),
              },
              {
                title: t.purchaseOrders.expectedDate,
                dataIndex: "expectedDate",
                render: (d: string | null) => (d ? dayjs(d).format("DD/MM/YYYY") : "—"),
              },
            ]}
          />
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
        width={720}
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
                  <Space
                    key={field.key}
                    align="start"
                    style={{ display: "flex", marginBottom: 8, width: "100%" }}
                    wrap
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, "productId"]}
                      rules={[{ required: true, message: t.purchaseOrders.productRequired }]}
                      style={{ minWidth: 220, marginBottom: 0 }}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder={t.purchaseOrders.product}
                        style={{ minWidth: 220 }}
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
                      style={{ width: 100, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={1}
                        placeholder={t.purchaseOrders.qty}
                        style={{ width: 100 }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "unitCost"]}
                      rules={[{ required: true }]}
                      style={{ width: 120, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        placeholder={t.purchaseOrders.unitCost}
                        style={{ width: 120 }}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={16} />}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </Space>
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
