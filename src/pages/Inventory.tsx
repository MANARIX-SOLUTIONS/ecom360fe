import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Button,
  Segmented,
  Skeleton,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Boxes, ClipboardList, History, Package, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { NoStoreBanner } from "@/components/NoStoreBanner";
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import {
  adjustStock,
  getAllStockByStore,
  getStockByStore,
  getStockMovements,
  type StockLevelResponse,
  type StockMovementResponse,
} from "@/api";
import { t } from "@/i18n";
import {
  STOCK_STATUS_COLOR,
  STOCK_STATUS_LABEL,
  stockDisplayStatus,
  type StockDisplayStatus,
} from "@/utils/stockStatus";
import styles from "./Inventory.module.css";

type FilterKey = "all" | StockDisplayStatus;

function movementTypeLabel(type: string): string {
  switch (type) {
    case "in":
    case "purchase":
      return t.products.movementTypeIn;
    case "out":
    case "sale":
      return t.products.movementTypeOut;
    case "adjustment":
      return t.products.movementTypeAdjustment;
    default:
      return type;
  }
}

export default function Inventory() {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const { matrixCan } = useMatrixCan();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<StockLevelResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [kpiRows, setKpiRows] = useState<StockLevelResponse[]>([]);
  const [adjustRow, setAdjustRow] = useState<StockLevelResponse | null>(null);
  const [adjustForm] = Form.useForm();
  const [historyRow, setHistoryRow] = useState<StockLevelResponse | null>(null);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debounced, filter, activeStore?.id]);

  const load = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!activeStore?.id) {
        setRows([]);
        setTotal(0);
        setKpiRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [res, all] = await Promise.all([
          getStockByStore(activeStore.id, {
            page,
            size: pageSize,
            search: debounced || undefined,
          }),
          page === 0 && !debounced ? getAllStockByStore(activeStore.id) : Promise.resolve(null),
        ]);
        if (signal?.cancelled) return;
        setRows(res.content ?? []);
        setTotal(res.totalElements ?? 0);
        if (all) setKpiRows(all);
      } catch (e) {
        if (signal?.cancelled) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setRows([]);
        setTotal(0);
      } finally {
        if (!signal?.cancelled) setLoading(false);
      }
    },
    [activeStore?.id, page, pageSize, debounced]
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const annotated = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        displayStatus: stockDisplayStatus({
          unit: row.unit,
          quantity: row.quantity,
          minStock: row.minStock,
        }),
      })),
    [rows]
  );

  const filtered = useMemo(
    () => (filter === "all" ? annotated : annotated.filter((row) => row.displayStatus === filter)),
    [annotated, filter]
  );

  const kpis = useMemo(() => {
    const source = kpiRows.length > 0 ? kpiRows : rows;
    const counts = { available: 0, low: 0, out: 0, untracked: 0 };
    for (const row of source) {
      counts[
        stockDisplayStatus({
          unit: row.unit,
          quantity: row.quantity,
          minStock: row.minStock,
        })
      ] += 1;
    }
    return counts;
  }, [kpiRows, rows]);

  const openHistory = async (row: StockLevelResponse) => {
    if (!activeStore?.id) return;
    setHistoryRow(row);
    setMovementsLoading(true);
    try {
      const res = await getStockMovements(row.productId, activeStore.id, {
        page: 0,
        size: 30,
      });
      setMovements(res.content ?? []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.msgLoadError);
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  };

  const saveAdjust = async () => {
    if (!adjustRow || !activeStore?.id) return;
    const values = await adjustForm.validateFields();
    try {
      await adjustStock({
        productId: adjustRow.productId,
        storeId: activeStore.id,
        quantity: values.newStock,
        type: "adjustment",
        note: values.reason || "Ajustement manuel",
      });
      message.success(t.products.msgStockUpdated);
      setAdjustRow(null);
      adjustForm.resetFields();
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    }
  };

  if (!activeStore) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <PageHeader
          title="Stock"
          subtitle="Quantités disponibles par boutique, distinctes du catalogue."
        />
        <NoStoreBanner />
      </div>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <PageHeader title="Stock" subtitle="Chargement des niveaux de stock…" />
        <Card variant="borderless" className={styles.card}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Stock"
        subtitle={`${activeStore.name} · les prestations ne sont pas des quantités de stock.`}
        extra={
          matrixCan("PURCHASE_ORDERS_CREATE", "purchaseOrders") ? (
            <Button icon={<ClipboardList size={16} />} onClick={() => navigate("/purchase-orders")}>
              {t.purchaseOrders.title}
            </Button>
          ) : undefined
        }
      />
      <NoStoreBanner />

      <div className={styles.kpiRow}>
        <div className={styles.kpiGrid}>
          <KpiCard label="Disponible" value={String(kpis.available)} icon={Package} />
          <KpiCard label="Stock faible" value={String(kpis.low)} icon={Boxes} />
          <KpiCard label="Rupture" value={String(kpis.out)} icon={Boxes} />
          <KpiCard
            label="Non suivi"
            value={String(kpis.untracked)}
            icon={Package}
            footnote="Prestations / forfaits"
          />
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input
            allowClear
            prefix={<Search size={16} />}
            className={styles.searchInput}
            placeholder="Rechercher un produit"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Segmented
            value={filter}
            onChange={(value) => setFilter(value as FilterKey)}
            options={[
              { label: "Tout", value: "all" },
              { label: "Disponible", value: "available" },
              { label: "Faible", value: "low" },
              { label: "Rupture", value: "out" },
              { label: "Non suivi", value: "untracked" },
            ]}
          />
        </div>
      </div>

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Aucun article pour ce filtre"
            description="Les produits suivis apparaîtront ici. Les prestations restent « non suivi »."
          />
        ) : (
          <div className="tableResponsive">
            <Table
              className="dataTable"
              rowKey={(r) => `${r.productId}-${r.storeId}`}
              dataSource={filtered}
              pagination={{
                current: page + 1,
                pageSize,
                total: filter === "all" ? total : filtered.length,
                showSizeChanger: true,
                onChange: (p, size) => {
                  setPage(p - 1);
                  setPageSize(size);
                },
              }}
              columns={[
                {
                  title: "Produit",
                  dataIndex: "productName",
                  render: (name: string, r: StockLevelResponse) => (
                    <button
                      type="button"
                      className="ant-btn ant-btn-link"
                      onClick={() => navigate(`/products/${r.productId}`)}
                      style={{ padding: 0, height: "auto" }}
                    >
                      {name}
                    </button>
                  ),
                },
                {
                  title: "Quantité",
                  dataIndex: "quantity",
                  align: "right",
                  render: (qty: number, r: StockLevelResponse) => {
                    const status = stockDisplayStatus({
                      unit: r.unit,
                      quantity: qty,
                      minStock: r.minStock,
                    });
                    if (status === "untracked") {
                      return <Typography.Text type="secondary">—</Typography.Text>;
                    }
                    return <span className="amount">{qty}</span>;
                  },
                },
                {
                  title: "Seuil",
                  dataIndex: "minStock",
                  width: 80,
                  align: "right",
                  render: (min: number, r: StockLevelResponse) =>
                    stockDisplayStatus({
                      unit: r.unit,
                      quantity: r.quantity,
                      minStock: min,
                    }) === "untracked"
                      ? "—"
                      : min,
                },
                {
                  title: "Statut",
                  key: "status",
                  render: (_: unknown, r: StockLevelResponse) => {
                    const status = stockDisplayStatus({
                      unit: r.unit,
                      quantity: r.quantity,
                      minStock: r.minStock,
                    });
                    return (
                      <Tag color={STOCK_STATUS_COLOR[status]}>{STOCK_STATUS_LABEL[status]}</Tag>
                    );
                  },
                },
                {
                  title: "",
                  key: "actions",
                  width: 120,
                  render: (_: unknown, r: StockLevelResponse) => {
                    const status = stockDisplayStatus({
                      unit: r.unit,
                      quantity: r.quantity,
                      minStock: r.minStock,
                    });
                    return (
                      <span style={{ display: "inline-flex", gap: 4 }}>
                        <Button
                          type="text"
                          aria-label="Historique"
                          icon={<History size={16} />}
                          onClick={() => void openHistory(r)}
                        />
                        {status !== "untracked" && matrixCan("STOCK_ADJUST", "products") ? (
                          <Button
                            type="text"
                            aria-label={t.products.stockAdjustment}
                            icon={<SlidersHorizontal size={16} />}
                            onClick={() => {
                              setAdjustRow(r);
                              adjustForm.setFieldsValue({
                                newStock: r.quantity,
                                reason: "Ajustement manuel",
                              });
                            }}
                          />
                        ) : null}
                      </span>
                    );
                  },
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Modal
        title={t.products.stockAdjustment}
        open={Boolean(adjustRow)}
        onOk={() => void saveAdjust()}
        onCancel={() => {
          setAdjustRow(null);
          adjustForm.resetFields();
        }}
        okText={t.products.save}
        destroyOnHidden
      >
        {adjustRow ? (
          <Form form={adjustForm} layout="vertical" style={{ marginTop: 12 }}>
            <Typography.Text type="secondary">{adjustRow.productName}</Typography.Text>
            <Typography.Paragraph>
              Stock actuel : <strong className="amount">{adjustRow.quantity}</strong>
            </Typography.Paragraph>
            <Form.Item
              name="newStock"
              label={t.products.newStock}
              rules={[
                { required: true, message: t.validation.requiredField },
                { type: "number", min: 0, message: t.validation.numberMin },
              ]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="reason" label={t.products.reason}>
              <Input placeholder="Inventaire, casse, correction…" />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Drawer
        title={historyRow ? `Mouvements · ${historyRow.productName}` : "Mouvements"}
        open={Boolean(historyRow)}
        onClose={() => {
          setHistoryRow(null);
          setMovements([]);
        }}
        width={440}
      >
        {movementsLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : movements.length === 0 ? (
          <EmptyState
            compact
            icon={History}
            title="Aucun mouvement"
            description="Ventes, réceptions et ajustements apparaîtront ici."
          />
        ) : (
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={movements}
            columns={[
              {
                title: "Type",
                dataIndex: "type",
                render: (type: string) => movementTypeLabel(type),
              },
              {
                title: "Qté",
                dataIndex: "quantity",
                width: 64,
                align: "right",
              },
              {
                title: "Avant → après",
                key: "delta",
                render: (_: unknown, m: StockMovementResponse) =>
                  `${m.quantityBefore} → ${m.quantityAfter}`,
              },
              {
                title: "Date",
                dataIndex: "createdAt",
                render: (iso: string) => (
                  <span className={styles.movementMeta}>
                    {new Date(iso).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
