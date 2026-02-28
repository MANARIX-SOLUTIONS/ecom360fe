import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Card, Button, Typography, Table, Tag, Modal, Form, Input, message, Skeleton } from "antd";
import { CurrencyInput } from "@/components/CurrencyInput";
import { ArrowLeft, Phone, Mail, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Clients.module.css";
import {
  getClient,
  updateClient,
  deleteClient,
  recordClientPayment,
  listClientPayments,
  ApiError,
} from "@/api";
import { useStore } from "@/hooks/useStore";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import type { ClientResponse } from "@/api";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const { canClientCredits } = usePlanFeatures();
  const [client, setClient] = useState<ClientResponse | null>(null);
  const [payments, setPayments] = useState<{ id: string; date: string; amount: number }[]>([]);
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
        message.error(e instanceof Error ? e.message : "Erreur chargement");
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

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    if (client) fetchPayments();
  }, [client, fetchPayments]);

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
      <ResourceNotFound resource="Client" backPath="/clients" backLabel="Retour aux clients" />
    );
  if (!client) return <Navigate to="/clients" replace />;

  const balanceColor =
    client.creditBalance > 0
      ? "var(--color-success)"
      : client.creditBalance < 0
        ? "var(--color-danger)"
        : "var(--color-text)";

  const handleEdit = () => {
    editForm.validateFields().then(async (values) => {
      try {
        await updateClient(id, {
          name: values.name,
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
        });
        message.success("Client mis à jour");
        setEditOpen(false);
        fetchClient();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm(t.common.delete + " ?")) return;
    deleteClient(id)
      .then(() => {
        message.success("Client supprimé");
        navigate("/clients");
      })
      .catch((e) => message.error(e instanceof Error ? e.message : "Erreur"));
  };

  const handlePayment = async () => {
    if (paymentAmount <= 0 || !activeStore?.id) {
      message.error(t.validation.amountMin);
      return;
    }
    try {
      await recordClientPayment(id, {
        storeId: activeStore.id,
        amount: paymentAmount,
        paymentMethod: "cash",
      });
      message.success("Paiement enregistré");
      setPaymentOpen(false);
      setPaymentAmount(Math.abs(client.creditBalance));
      fetchClient();
      fetchPayments();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur");
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
              {client.creditBalance.toLocaleString("fr-FR")} F
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {canClientCredits && (
              <Button
                type="primary"
                icon={<Plus size={18} />}
                onClick={() => {
                  setPaymentAmount(Math.abs(client.creditBalance));
                  setPaymentOpen(true);
                }}
              >
                {t.clients.addPayment}
              </Button>
            )}
            <Button icon={<Pencil size={18} />} onClick={() => setEditOpen(true)}>
              {t.common.edit}
            </Button>
            <Button danger icon={<Trash2 size={18} />} onClick={handleDelete}>
              {t.common.delete}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={t.clients.paymentHistory}
        variant="borderless"
        className={`${styles.card} contentCard`}
      >
        {payments.length === 0 ? (
          <Typography.Text type="secondary">Aucun paiement enregistré</Typography.Text>
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={payments}
              rowKey="id"
              pagination={false}
              size="small"
              className="dataTable"
              columns={[
                { title: t.common.date, dataIndex: "date" },
                {
                  title: t.expenses.amount,
                  dataIndex: "amount",
                  render: (v: number) => <Tag color="success">+{v.toLocaleString("fr-FR")} F</Tag>,
                },
              ]}
            />
          </div>
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
            <Input placeholder="Nom du client" />
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
            <Input placeholder="77 123 45 67" />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.common.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item name="address" label={t.common.address}>
            <Input placeholder="Adresse du client" />
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
                <strong>{client.creditBalance.toLocaleString("fr-FR")} F</strong>
              </Typography.Text>
            </div>
          </div>
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label={t.expenses.amount}>
              <CurrencyInput
                min={1}
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
