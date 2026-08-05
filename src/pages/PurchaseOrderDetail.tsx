import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Navigate, Link } from "react-router-dom";
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Skeleton,
  Space,
  Modal,
  message,
  Descriptions,
} from "antd";
import { ArrowLeft, CheckCircle, Send, XCircle } from "lucide-react";
import dayjs from "dayjs";
import { t } from "@/i18n";
import styles from "./Clients.module.css";
import {
  getPurchaseOrder,
  updatePurchaseOrderStatus,
  getSupplier,
  listStores,
  listProducts,
  type PurchaseOrderResponse,
  type PurchaseOrderStatus,
} from "@/api";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { ResourceNotFound } from "@/components/ResourceNotFound";

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

const NEXT_ACTIONS: Record<
  string,
  {
    status: PurchaseOrderStatus;
    labelKey: "actionOrder" | "actionReceive" | "actionCancel";
    danger?: boolean;
    confirm?: boolean;
  }[]
> = {
  draft: [
    { status: "ordered", labelKey: "actionOrder" },
    { status: "cancelled", labelKey: "actionCancel", danger: true },
  ],
  ordered: [
    { status: "received", labelKey: "actionReceive", confirm: true },
    { status: "cancelled", labelKey: "actionCancel", danger: true },
  ],
  received: [],
  cancelled: [],
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();
  const [po, setPo] = useState<PurchaseOrderResponse | null | undefined>(undefined);
  const [supplierName, setSupplierName] = useState<string>("");
  const [storeName, setStoreName] = useState<string>("");
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPurchaseOrder(id);
      setPo(data);
      const [supplier, stores, products] = await Promise.all([
        getSupplier(data.supplierId).catch(() => null),
        listStores().catch(() => []),
        listProducts({ page: 0, size: 200 }).catch(() => ({ content: [] })),
      ]);
      setSupplierName(supplier?.name ?? "");
      setStoreName(stores.find((s) => s.id === data.storeId)?.name ?? "");
      const names: Record<string, string> = {};
      for (const p of products.content ?? []) {
        names[p.id] = p.name;
      }
      setProductNames(names);
    } catch {
      setPo(null);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) return <Navigate to="/purchase-orders" replace />;

  if (po === undefined) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (po === null) {
    return (
      <ResourceNotFound
        resource={t.purchaseOrders.resourceLabel}
        backPath="/purchase-orders"
        backLabel={t.purchaseOrders.notFoundBack}
      />
    );
  }

  const transition = (status: PurchaseOrderStatus, confirmReceive?: boolean) => {
    const run = async () => {
      setActing(true);
      try {
        const updated = await updatePurchaseOrderStatus(po.id, status);
        setPo(updated);
        message.success(
          status === "received"
            ? t.purchaseOrders.msgReceived
            : status === "ordered"
              ? t.purchaseOrders.msgOrdered
              : t.purchaseOrders.msgCancelled
        );
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
      } finally {
        setActing(false);
      }
    };

    if (confirmReceive && status === "received") {
      Modal.confirm({
        title: t.purchaseOrders.receiveConfirmTitle,
        content: t.purchaseOrders.receiveConfirmDesc,
        okText: t.purchaseOrders.actionReceive,
        cancelText: t.common.cancel,
        onOk: run,
      });
      return;
    }
    if (status === "cancelled") {
      Modal.confirm({
        title: t.purchaseOrders.cancelConfirmTitle,
        okText: t.purchaseOrders.actionCancel,
        okButtonProps: { danger: true },
        cancelText: t.common.cancel,
        onOk: run,
      });
      return;
    }
    void run();
  };

  const actions = NEXT_ACTIONS[po.status] ?? [];
  const canUpdate = matrixCan("PURCHASE_ORDERS_UPDATE", "purchaseOrders");

  return (
    <div className={`${styles.page} pageWrapper`}>
      <Button
        type="text"
        icon={<ArrowLeft size={18} />}
        onClick={() => navigate("/purchase-orders")}
        style={{ marginBottom: 12 }}
      >
        {t.common.back}
      </Button>

      <Card
        variant="borderless"
        className={`${styles.card} contentCard`}
        style={{ marginBottom: 16 }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
        >
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {po.reference}
            </Typography.Title>
            <Tag color={STATUS_COLOR[po.status] || "default"} style={{ marginTop: 8 }}>
              {statusLabel(po.status)}
            </Tag>
          </div>
          {canUpdate && actions.length > 0 && (
            <Space wrap>
              {actions.map((a) => (
                <Button
                  key={a.status}
                  type={a.status === "received" || a.status === "ordered" ? "primary" : "default"}
                  danger={a.danger}
                  loading={acting}
                  icon={
                    a.status === "received" ? (
                      <CheckCircle size={16} />
                    ) : a.status === "ordered" ? (
                      <Send size={16} />
                    ) : (
                      <XCircle size={16} />
                    )
                  }
                  onClick={() => transition(a.status, a.confirm)}
                >
                  {t.purchaseOrders[a.labelKey]}
                </Button>
              ))}
            </Space>
          )}
        </div>

        <Descriptions
          column={{ xs: 1, sm: 2 }}
          style={{ marginTop: 20 }}
          size="small"
          items={[
            {
              key: "supplier",
              label: t.purchaseOrders.supplier,
              children: (
                <Link to={`/suppliers/${po.supplierId}`}>
                  {supplierName || po.supplierId.slice(0, 8)}
                </Link>
              ),
            },
            {
              key: "store",
              label: t.purchaseOrders.store,
              children: storeName || "—",
            },
            {
              key: "total",
              label: t.purchaseOrders.total,
              children: <Typography.Text strong>{formatFCFA(po.totalAmount)}</Typography.Text>,
            },
            {
              key: "expected",
              label: t.purchaseOrders.expectedDate,
              children: po.expectedDate ? dayjs(po.expectedDate).format("DD/MM/YYYY") : "—",
            },
            {
              key: "received",
              label: t.purchaseOrders.receivedDate,
              children: po.receivedDate ? dayjs(po.receivedDate).format("DD/MM/YYYY") : "—",
            },
            {
              key: "note",
              label: t.purchaseOrders.note,
              children: po.note || "—",
            },
            {
              key: "created",
              label: t.purchaseOrders.createdAt,
              children: dayjs(po.createdAt).format("DD/MM/YYYY HH:mm"),
            },
          ]}
        />
      </Card>

      <Card
        variant="borderless"
        className={`${styles.card} contentCard`}
        title={t.purchaseOrders.lines}
      >
        <Table
          rowKey="id"
          pagination={false}
          dataSource={po.lines}
          columns={[
            {
              title: t.purchaseOrders.product,
              dataIndex: "productId",
              render: (pid: string) => productNames[pid] ?? pid.slice(0, 8),
            },
            {
              title: t.purchaseOrders.qty,
              dataIndex: "quantity",
              align: "right",
            },
            {
              title: t.purchaseOrders.unitCost,
              dataIndex: "unitCost",
              align: "right",
              render: (n: number) => formatFCFA(n),
            },
            {
              title: t.purchaseOrders.lineTotal,
              dataIndex: "lineTotal",
              align: "right",
              render: (n: number) => formatFCFA(n),
            },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3} align="right">
                <Typography.Text strong>{t.purchaseOrders.total}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Typography.Text strong>{formatFCFA(po.totalAmount)}</Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
}
