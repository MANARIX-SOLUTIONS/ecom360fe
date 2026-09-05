import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Card, Button, Typography, Modal, Form, Input, message, Skeleton } from "antd";
import { CurrencyInput } from "@/components/CurrencyInput";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Phone, Mail, MapPin, Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Clients.module.css";
import {
  getClient,
  updateClient,
  deleteClient,
  recordClientPayment,
  listClientPayments,
  listSales,
  ApiError,
} from "@/api";
import type { ClientResponse, SaleResponse } from "@/api";
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { canRecordClientPayment, creditBalanceCssVar } from "@/utils/clientCredit";
import { isWalkInClientName } from "@/utils/clientWalkIn";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatAmount(n: number) {
  return `${n.toLocaleString("fr-FR")} F`;
}

function formatDay(isoDate: string | null | undefined) {
  if (!isoDate) return "—";
  return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR");
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const { canClientCredits } = usePlanFeatures();
  const { matrixCan } = useMatrixCan();
  const [client, setClient] = useState<ClientResponse | null>(null);
  const [payments, setPayments] = useState<{ id: string; date: string; amount: number }[]>([]);
  const [outstandingSales, setOutstandingSales] = useState<SaleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [editForm] = Form.useForm();

  const fetchClient = useCallback(async () => {
    if (!id || !localStorage.getItem("ecom360_access_token")) return;
    setLoading(true);
    try {
      const res = await getClient(id);
      setClient(res);
      editForm.setFieldsValue({
        name: res.name,
        phone: res.phone || "",
        email: res.email || "",
        address: res.address || "",
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
      } else {
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setClient(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id, editForm]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    try {
      const res = await listClientPayments(id, { page: 0, size: 50 });
      setPayments(
        res.content.map((p) => ({
          id: p.id,
          date: p.createdAt.split("T")[0],
          amount: p.amount,
        }))
      );
    } catch {
      setPayments([]);
    }
  }, [id]);

  const fetchOutstandingSales = useCallback(async () => {
    if (!id) return;
    try {
      const res = await listSales({ clientId: id, status: "completed", size: 50 });
      setOutstandingSales((res.content ?? []).filter((s) => (s.remainingAmount ?? 0) > 0));
    } catch {
      setOutstandingSales([]);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    if (client) {
      fetchPayments();
      fetchOutstandingSales();
    }
  }, [client, fetchPayments, fetchOutstandingSales]);

  if (!id) return <Navigate to="/clients" replace />;

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.backWrap}>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
        <Card variant="borderless" className={styles.heroCard}>
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        </Card>
      </div>
    );
  }

  if (notFound)
    return (
      <ResourceNotFound
        resource={t.clients.resourceLabel}
        backPath="/clients"
        backLabel={t.clients.notFoundBack}
      />
    );
  if (!client) return <Navigate to="/clients" replace />;

  const balanceColor = creditBalanceCssVar(client.creditBalance);
  const canPay = canRecordClientPayment({
    canClientCredits,
    balance: client.creditBalance,
    isWalkIn: isWalkInClientName(client.name),
  });

  const handleEdit = () => {
    editForm.validateFields().then(async (values) => {
      try {
        await updateClient(id, {
          name: values.name,
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
        });
        message.success(t.clients.msgUpdated);
        setEditOpen(false);
        fetchClient();
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
      }
    });
  };

  const handleDelete = () => {
    Modal.confirm({
      title: t.common.delete,
      content: t.list.deleteConfirm.replace("{name}", client.name),
      okText: t.list.deleteOk,
      okType: "danger",
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteClient(id);
          message.success(t.clients.msgDeleted);
          navigate("/clients");
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        }
      },
    });
  };

  const handlePayment = async () => {
    if (!activeStore?.id) {
      message.error(t.clients.paymentNeedsActiveStore);
      return;
    }
    if (isWalkInClientName(client.name)) {
      message.error(t.clients.walkInNoCreditPayment);
      return;
    }
    if (client.creditBalance <= 0) {
      message.error(t.clients.noOutstandingBalance);
      return;
    }
    if (paymentAmount <= 0) {
      message.error(t.validation.amountMin);
      return;
    }
    if (paymentAmount > client.creditBalance) {
      message.error(t.clients.paymentExceedsBalance);
      return;
    }
    try {
      await recordClientPayment(id, {
        storeId: activeStore.id,
        amount: paymentAmount,
        paymentMethod: "cash",
      });
      message.success(t.common.paymentRecorded);
      setPaymentOpen(false);
      setPaymentAmount(Math.abs(client.creditBalance));
      fetchClient();
      fetchPayments();
      fetchOutstandingSales();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    }
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      <div className={styles.backWrap}>
        <Button type="text" icon={<ArrowLeft size={18} />} onClick={() => navigate("/clients")}>
          {t.common.back}
        </Button>
      </div>

      {/* Hero summary card */}
      <Card variant="borderless" className={styles.heroCard}>
        <div className={styles.heroInner}>
          <span className={styles.heroAvatar}>{getInitials(client.name)}</span>
          <div className={styles.heroInfo}>
            <Typography.Title level={4} className={styles.heroName}>
              {client.name}
            </Typography.Title>
            <div className={styles.heroMeta}>
              {client.phone && (
                <span className={styles.heroMetaItem}>
                  <Phone size={14} />
                  {client.phone}
                </span>
              )}
              {client.email && (
                <span className={styles.heroMetaItem}>
                  <Mail size={14} />
                  {client.email}
                </span>
              )}
              {client.address && (
                <span className={styles.heroMetaItem}>
                  <MapPin size={14} />
                  {client.address}
                </span>
              )}
            </div>
          </div>
          <div className={styles.heroBalance}>
            <span className={styles.heroBalanceLabel}>{t.clients.outstandingBalance}</span>
            <span className={styles.heroBalanceAmount} style={{ color: balanceColor }}>
              {client.creditBalance > 0 ? "+" : ""}
              {formatAmount(client.creditBalance)}
            </span>
          </div>
          <div className={styles.heroActions}>
            {canPay && matrixCan("CLIENTS_UPDATE", "clients") && (
              <Button
                type="primary"
                icon={<Plus size={18} />}
                onClick={() => {
                  setPaymentAmount(client.creditBalance);
                  setPaymentOpen(true);
                }}
              >
                {t.clients.addPayment}
              </Button>
            )}
            {matrixCan("CLIENTS_UPDATE", "clients") && (
              <Button icon={<Pencil size={18} />} onClick={() => setEditOpen(true)}>
                {t.common.edit}
              </Button>
            )}
            {matrixCan("CLIENTS_DELETE", "clients") && (
              <Button danger icon={<Trash2 size={18} />} onClick={handleDelete}>
                {t.common.delete}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card
        title={t.clients.outstandingSales}
        variant="borderless"
        className={`${styles.card} contentCard`}
      >
        {outstandingSales.length === 0 ? (
          <EmptyState
            compact
            icon={Wallet}
            title={t.clients.noOutstandingSales}
            description={t.clients.outstandingSalesDesc}
          />
        ) : (
          <ul className={styles.list}>
            {outstandingSales.map((sale) => (
              <li key={sale.id} className={`${styles.row} ${styles.rowDue}`}>
                <button
                  type="button"
                  className={styles.identity}
                  onClick={() => navigate("/receipt", { state: { saleId: sale.id } })}
                  aria-label={t.sales.openReceiptAria.replace("{ticket}", sale.receiptNumber)}
                >
                  <span className={styles.identityText}>
                    <span className={styles.name}>{sale.receiptNumber}</span>
                    <span className={styles.meta}>{formatDay(sale.dueDate)}</span>
                  </span>
                </button>
                <div className={styles.statusCol}>
                  <span className={`${styles.pill} ${styles.pillWarn}`}>
                    {formatAmount(sale.remainingAmount ?? 0)}
                  </span>
                </div>
                <div className={styles.money}>
                  <span className={styles.total}>{formatAmount(sale.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title={t.clients.paymentHistory}
        variant="borderless"
        className={`${styles.card} contentCard`}
      >
        {payments.length === 0 ? (
          <EmptyState
            compact
            icon={Wallet}
            title={t.clients.emptyPaymentHistoryTitle}
            description={t.clients.emptyPaymentHistoryDesc}
          />
        ) : (
          <ul className={styles.list}>
            {payments.map((payment) => (
              <li key={payment.id} className={styles.row}>
                <div className={`${styles.identity} ${styles.identityStatic}`}>
                  <span className={styles.identityText}>
                    <span className={styles.name}>{formatDay(payment.date)}</span>
                  </span>
                </div>
                <div className={styles.statusCol}>
                  <span className={`${styles.pill} ${styles.pillOk}`}>
                    +{formatAmount(payment.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        title={t.clients.editClient}
        open={editOpen}
        onOk={handleEdit}
        onCancel={() => setEditOpen(false)}
        okText={t.products.save}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder={t.clients.placeholderClientName} />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t.common.phone}
            rules={[
              {
                pattern: /^[\d\s+()-]{0,20}$/,
                message: t.validation.phoneInvalid,
              },
            ]}
          >
            <Input placeholder={t.clients.placeholderPhoneExample} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.common.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item name="address" label={t.common.address}>
            <Input placeholder={t.clients.placeholderAddress} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.clients.addPayment}
        open={paymentOpen}
        onOk={handlePayment}
        onCancel={() => setPaymentOpen(false)}
        okText={t.products.save}
      >
        <div style={{ marginTop: 16 }}>
          <div className={styles.paymentModalHeader}>
            <span className={styles.avatarMedium}>{getInitials(client.name)}</span>
            <div>
              <Typography.Text strong style={{ display: "block" }}>
                {client.name}
              </Typography.Text>
              <Typography.Text type="secondary">
                {t.clients.outstandingBalance}:{" "}
                <strong>{formatAmount(client.creditBalance)}</strong>
              </Typography.Text>
            </div>
          </div>
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label={t.expenses.amount}>
              <CurrencyInput
                min={1}
                max={client.creditBalance}
                value={paymentAmount}
                onChange={(v) => setPaymentAmount(Number(v) || 0)}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
