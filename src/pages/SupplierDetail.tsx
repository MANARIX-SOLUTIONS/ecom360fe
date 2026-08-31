import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import {
  Card,
  Button,
  Typography,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Skeleton,
} from "antd";
import { CurrencyInput } from "@/components/CurrencyInput";
import { EmptyState } from "@/components/EmptyState";
import { RecordPurchaseOrderPaymentModal } from "@/components/RecordPurchaseOrderPaymentModal";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { t } from "@/i18n";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import styles from "./Clients.module.css";
import {
  getSupplier,
  updateSupplier,
  deleteSupplier,
  recordSupplierPayment,
  listSupplierPayments,
  listPurchaseOrders,
  ApiError,
} from "@/api";
import type { PurchaseOrderResponse, SupplierPaymentResponse, SupplierResponse } from "@/api";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";

const METHOD_LABELS: Record<string, string> = {
  cash: t.pos.cash,
  wave: t.pos.wave,
  orange_money: t.pos.orangeMoney,
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatIsoDate(isoDate: string): string {
  const day = isoDate.slice(0, 10);
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR");
}

function isOverdue(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return false;
  return new Date(y, m - 1, d) < today;
}

function formatFcfa(n: number): string {
  return `${n.toLocaleString("fr-FR")} F`;
}

/** Un solde positif est une dette envers le fournisseur. */
function supplierBalanceColor(balance: number): string {
  if (balance > 0) return "#d46b08";
  if (balance < 0) return "var(--color-success)";
  return "var(--color-text-muted)";
}

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();
  const { canAccess: canAccessNav } = usePermissions();
  const { canAccess: canAccessPlan, canMultiPayment } = usePlanFeatures();
  const canAccessPurchaseOrders = canAccessPlan("purchaseOrders", canAccessNav("purchaseOrders"));

  const [supplier, setSupplier] = useState<SupplierResponse | null>(null);
  const [payments, setPayments] = useState<SupplierPaymentResponse[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<PurchaseOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paying, setPaying] = useState(false);
  const [payPo, setPayPo] = useState<PurchaseOrderResponse | null>(null);
  const [editForm] = Form.useForm();

  const methodOptions = useMemo(() => {
    const options = [{ value: "cash", label: METHOD_LABELS.cash }];
    if (canMultiPayment) {
      options.push(
        { value: "wave", label: METHOD_LABELS.wave },
        { value: "orange_money", label: METHOD_LABELS.orange_money }
      );
    }
    return options;
  }, [canMultiPayment]);

  const loadAll = useCallback(async () => {
    if (!id || !localStorage.getItem("ecom360_access_token")) return;
    setLoading(true);
    try {
      const [sup, payRes, poRes] = await Promise.all([
        getSupplier(id),
        listSupplierPayments(id, { page: 0, size: 50 }).catch(() => ({
          content: [] as SupplierPaymentResponse[],
        })),
        listPurchaseOrders({
          supplierId: id,
          status: "received",
          page: 0,
          size: 50,
        }).catch(() => ({ content: [] as PurchaseOrderResponse[] })),
      ]);
      setSupplier(sup);
      editForm.setFieldsValue({
        name: sup.name,
        phone: sup.phone || "",
        email: sup.email || "",
        zone: sup.zone || "",
        address: sup.address || "",
      });
      setPayments(payRes.content ?? []);
      setOutstandingOrders((poRes.content ?? []).filter((po) => (po.remainingAmount ?? 0) > 0));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
      } else {
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setSupplier(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id, editForm]);

  const refreshAfterPayment = useCallback(async () => {
    if (!id) return;
    try {
      const [sup, payRes, poRes] = await Promise.all([
        getSupplier(id),
        listSupplierPayments(id, { page: 0, size: 50 }).catch(() => ({
          content: [] as SupplierPaymentResponse[],
        })),
        listPurchaseOrders({
          supplierId: id,
          status: "received",
          page: 0,
          size: 50,
        }).catch(() => ({ content: [] as PurchaseOrderResponse[] })),
      ]);
      setSupplier(sup);
      setPayments(payRes.content ?? []);
      setOutstandingOrders((poRes.content ?? []).filter((po) => (po.remainingAmount ?? 0) > 0));
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.msgLoadError);
    }
  }, [id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (!id) return <Navigate to="/suppliers" replace />;

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.backWrap}>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
        <Card variant="borderless" className={styles.heroCard}>
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        </Card>
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      </div>
    );
  }

  if (notFound)
    return (
      <ResourceNotFound
        resource={t.suppliers.resourceLabel}
        backPath="/suppliers"
        backLabel={t.suppliers.notFoundBack}
      />
    );
  if (!supplier) return <Navigate to="/suppliers" replace />;

  const owed = Math.max(0, supplier.balance);
  const canPay = owed > 0 && matrixCan("SUPPLIERS_UPDATE", "suppliers");
  const remainingAfterPay = Math.max(0, owed - paymentAmount);
  const canSettlePo = matrixCan("PURCHASE_ORDERS_UPDATE", "purchaseOrders");

  const handleEdit = () => {
    editForm.validateFields().then(async (values) => {
      try {
        await updateSupplier(id, {
          name: values.name,
          phone: values.phone || undefined,
          email: values.email || undefined,
          zone: values.zone || undefined,
          address: values.address || undefined,
        });
        message.success(t.suppliers.msgUpdated);
        setEditOpen(false);
        void loadAll();
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
      }
    });
  };

  const handleDelete = () => {
    Modal.confirm({
      title: t.suppliers.deleteConfirmTitle,
      content: t.suppliers.deleteConfirmDesc,
      okText: t.common.delete,
      okButtonProps: { danger: true },
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteSupplier(id);
          message.success(t.suppliers.msgDeleted);
          navigate("/suppliers");
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
          return Promise.reject(e);
        }
      },
    });
  };

  const openPayment = () => {
    setPaymentAmount(owed);
    setPaymentMethod("cash");
    setPaymentOpen(true);
  };

  const handlePayment = async () => {
    if (owed <= 0) {
      message.error(t.suppliers.noOutstandingBalance);
      return;
    }
    if (paymentAmount <= 0) {
      message.error(t.validation.amountMin);
      return;
    }
    if (paymentAmount > owed) {
      message.error(t.suppliers.paymentExceedsBalance);
      return;
    }
    setPaying(true);
    try {
      await recordSupplierPayment(id, {
        amount: paymentAmount,
        paymentMethod,
      });
      message.success(t.common.paymentRecorded);
      setPaymentOpen(false);
      await refreshAfterPayment();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      <div className={styles.backWrap}>
        <Button type="text" icon={<ArrowLeft size={18} />} onClick={() => navigate("/suppliers")}>
          {t.common.back}
        </Button>
      </div>

      <Card variant="borderless" className={styles.heroCard}>
        <div className={styles.heroInner}>
          <span className={styles.heroAvatar}>{getInitials(supplier.name)}</span>
          <div className={styles.heroInfo}>
            <Typography.Title level={4} className={styles.heroName}>
              {supplier.name}
              {!supplier.isActive && <Tag style={{ marginLeft: 8 }}>{t.suppliers.inactive}</Tag>}
            </Typography.Title>
            <div className={styles.heroMeta}>
              {supplier.phone && (
                <span className={styles.heroMetaItem}>
                  <Phone size={14} />
                  {supplier.phone}
                </span>
              )}
              {supplier.email && (
                <span className={styles.heroMetaItem}>
                  <Mail size={14} />
                  {supplier.email}
                </span>
              )}
              {supplier.zone && (
                <span className={styles.heroMetaItem}>
                  <MapPin size={14} />
                  {supplier.zone}
                </span>
              )}
              {supplier.address && (
                <span className={styles.heroMetaItem}>
                  <MapPin size={14} />
                  {supplier.address}
                </span>
              )}
            </div>
          </div>
          <div className={styles.heroBalance}>
            <span className={styles.heroBalanceLabel}>{t.suppliers.outstandingBalance}</span>
            <span
              className={styles.heroBalanceAmount}
              style={{ color: supplierBalanceColor(supplier.balance) }}
            >
              {formatFcfa(supplier.balance)}
            </span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {owed > 0
                ? t.suppliers.outstandingCount.replace("{count}", String(outstandingOrders.length))
                : t.suppliers.settled}
            </Typography.Text>
          </div>
          <div className={styles.heroActions}>
            {canPay && (
              <Button type="primary" icon={<Plus size={18} />} onClick={openPayment}>
                {t.suppliers.addPayment}
              </Button>
            )}
            {canAccessPurchaseOrders && (
              <Button
                icon={<ClipboardList size={18} />}
                onClick={() => navigate(`/purchase-orders?supplierId=${supplier.id}`)}
              >
                {t.suppliers.viewPurchaseOrders}
              </Button>
            )}
            {matrixCan("SUPPLIERS_UPDATE", "suppliers") && (
              <Button icon={<Pencil size={18} />} onClick={() => setEditOpen(true)}>
                {t.common.edit}
              </Button>
            )}
            {matrixCan("SUPPLIERS_DELETE", "suppliers") && (
              <Button danger icon={<Trash2 size={18} />} onClick={handleDelete}>
                {t.common.delete}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {canAccessPurchaseOrders && (
        <Card
          title={
            outstandingOrders.length > 0
              ? `${t.purchaseOrders.outstandingOrders} (${outstandingOrders.length})`
              : t.purchaseOrders.outstandingOrders
          }
          extra={
            <Link to={`/purchase-orders?supplierId=${supplier.id}`}>
              {t.suppliers.viewPurchaseOrders}
            </Link>
          }
          variant="borderless"
          className={`${styles.card} contentCard`}
        >
          {outstandingOrders.length === 0 ? (
            <EmptyState
              compact
              icon={ClipboardList}
              title={t.purchaseOrders.noOutstandingOrders}
              description={t.purchaseOrders.outstandingOrdersDesc}
            />
          ) : (
            <div className="tableResponsive">
              <Table
                dataSource={outstandingOrders}
                rowKey="id"
                pagination={false}
                size="small"
                className="dataTable"
                scroll={{ x: "max-content" }}
                onRow={(record) => ({
                  style: { cursor: "pointer" },
                  onClick: () => navigate(`/purchase-orders/${record.id}`),
                })}
                columns={[
                  {
                    title: t.purchaseOrders.reference,
                    dataIndex: "reference",
                    render: (ref: string) => <Typography.Text strong>{ref}</Typography.Text>,
                  },
                  {
                    title: t.purchaseOrders.total,
                    dataIndex: "totalAmount",
                    align: "right",
                    render: (v: number) => formatFcfa(v),
                  },
                  {
                    title: t.purchaseOrders.amountPaid,
                    dataIndex: "amountPaid",
                    align: "right",
                    render: (v: number) => formatFcfa(v ?? 0),
                  },
                  {
                    title: t.purchaseOrders.remainingDue,
                    dataIndex: "remainingAmount",
                    align: "right",
                    render: (v: number) => <Tag color="gold">{formatFcfa(v)}</Tag>,
                  },
                  {
                    title: t.purchaseOrders.dueDate,
                    dataIndex: "dueDate",
                    render: (v: string | null) =>
                      v ? (
                        <Space size={4}>
                          <span>{formatIsoDate(v)}</span>
                          {isOverdue(v) && <Tag color="red">{t.suppliers.overdue}</Tag>}
                        </Space>
                      ) : (
                        "—"
                      ),
                  },
                  ...(canSettlePo
                    ? [
                        {
                          title: t.common.actions,
                          key: "actions",
                          render: (_: unknown, record: PurchaseOrderResponse) => (
                            <Button
                              type="link"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPayPo(record);
                              }}
                            >
                              {t.purchaseOrders.recordPayment}
                            </Button>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          )}
        </Card>
      )}

      <Card
        title={t.suppliers.paymentHistory}
        variant="borderless"
        className={`${styles.card} contentCard`}
      >
        {payments.length === 0 ? (
          <EmptyState
            compact
            icon={Wallet}
            title={t.suppliers.emptyPaymentHistoryTitle}
            description={t.suppliers.emptyPaymentHistoryDesc}
          />
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={payments}
              rowKey="id"
              pagination={false}
              size="small"
              className="dataTable"
              scroll={{ x: "max-content" }}
              columns={[
                {
                  title: t.common.date,
                  dataIndex: "createdAt",
                  render: (v: string) => formatIsoDate(v),
                },
                {
                  title: t.receipt.paymentMethod,
                  dataIndex: "paymentMethod",
                  render: (v: string) => METHOD_LABELS[v] ?? v,
                },
                {
                  title: t.expenses.amount,
                  dataIndex: "amount",
                  align: "right",
                  render: (v: number) => <Typography.Text strong>{formatFcfa(v)}</Typography.Text>,
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Modal
        title={t.suppliers.editSupplier}
        open={editOpen}
        onOk={handleEdit}
        onCancel={() => setEditOpen(false)}
        okText={t.products.save}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder={t.suppliers.placeholderSupplierName} />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t.common.phone}
            rules={[{ pattern: /^[\d\s+()-]{0,20}$/, message: t.validation.phoneInvalid }]}
          >
            <Input placeholder={t.suppliers.placeholderPhoneExample} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.common.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item name="zone" label={t.common.zone}>
            <Input placeholder={t.suppliers.placeholderZoneExample} />
          </Form.Item>
          <Form.Item name="address" label={t.common.address}>
            <Input placeholder={t.suppliers.placeholderAddress} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.suppliers.addPayment}
        open={paymentOpen}
        onOk={() => void handlePayment()}
        onCancel={() => setPaymentOpen(false)}
        okText={t.products.save}
        confirmLoading={paying}
        okButtonProps={{ disabled: owed <= 0 }}
        destroyOnHidden
      >
        <div style={{ marginTop: 16 }}>
          <div className={styles.paymentModalHeader}>
            <span className={styles.avatarMedium}>{getInitials(supplier.name)}</span>
            <div>
              <Typography.Text strong style={{ display: "block" }}>
                {supplier.name}
              </Typography.Text>
              <Typography.Text type="secondary">
                {t.suppliers.outstandingBalance}: <strong>{formatFcfa(owed)}</strong>
              </Typography.Text>
            </div>
          </div>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            {t.suppliers.paymentHintFifo}
          </Typography.Paragraph>
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label={t.expenses.amount}>
              <CurrencyInput
                min={1}
                max={owed}
                value={paymentAmount}
                onChange={(v) => setPaymentAmount(Number(v) || 0)}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <div style={{ display: "flex", gap: 8, marginTop: -8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setPaymentAmount(Math.max(1, Math.round(owed / 2)))}
                style={chipStyle}
              >
                {t.pos.payHalf}
              </button>
              <button type="button" onClick={() => setPaymentAmount(owed)} style={chipStyle}>
                {t.pos.payInFull}
              </button>
            </div>
            <Form.Item label={t.receipt.paymentMethod}>
              <Select
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={methodOptions}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Form>
          <Typography.Text type="secondary">
            {t.suppliers.afterThisPayment}: <strong>{formatFcfa(remainingAfterPay)}</strong>
          </Typography.Text>
        </div>
      </Modal>

      <RecordPurchaseOrderPaymentModal
        open={!!payPo}
        po={payPo}
        onClose={() => setPayPo(null)}
        onRecorded={() => void refreshAfterPayment()}
      />
    </div>
  );
}

const chipStyle: CSSProperties = {
  flex: 1,
  height: 32,
  border: "1px solid #e8e8e8",
  borderRadius: 8,
  background: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
