import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Typography,
  Table,
  Tag,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Skeleton,
} from "antd";
import { ArrowLeft, Phone, Mail, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { t } from "@/i18n";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import styles from "./Clients.module.css";
import {
  getSupplier,
  updateSupplier,
  deleteSupplier,
  recordSupplierPayment,
  listSupplierPayments,
  ApiError,
} from "@/api";
import type { SupplierResponse } from "@/api";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<SupplierResponse | null>(null);
  const [payments, setPayments] = useState<{ id: string; date: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [editForm] = Form.useForm();

  const fetchSupplier = useCallback(async () => {
    if (!id || !localStorage.getItem("ecom360_access_token")) return;
    setLoading(true);
    try {
      const res = await getSupplier(id);
      setSupplier(res);
      editForm.setFieldsValue({
        name: res.name,
        phone: res.phone || "",
        email: res.email || "",
        zone: res.zone || "",
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
      } else {
        message.error(e instanceof Error ? e.message : "Erreur chargement");
        setSupplier(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id, editForm]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    try {
      const res = await listSupplierPayments(id, { page: 0, size: 50 });
      setPayments(
        res.content.map((p) => ({
          id: p.id,
          date: p.createdAt.split("T")[0],
          amount: p.amount,
        })),
      );
    } catch {
      setPayments([]);
    }
  }, [id]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  useEffect(() => {
    if (supplier) fetchPayments();
  }, [supplier, fetchPayments]);

  if (!id) return <Navigate to="/suppliers" replace />;

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.backWrap}>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
        <Card bordered={false} className={styles.heroCard}>
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        </Card>
      </div>
    );
  }

  if (notFound) return <ResourceNotFound resource="Fournisseur" backPath="/suppliers" backLabel="Retour aux fournisseurs" />;
  if (!supplier) return <Navigate to="/suppliers" replace />;

  const balanceColor =
    supplier.balance > 0
      ? "var(--color-success)"
      : supplier.balance < 0
        ? "var(--color-danger)"
        : "var(--color-text)";

  const handleEdit = () => {
    editForm.validateFields().then(async (values) => {
      try {
        await updateSupplier(id, {
          name: values.name,
          phone: values.phone || undefined,
          email: values.email || undefined,
          zone: values.zone || undefined,
        });
        message.success("Fournisseur mis à jour");
        setEditOpen(false);
        fetchSupplier();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm(t.common.delete + " ?")) return;
    deleteSupplier(id)
      .then(() => {
        message.success("Fournisseur supprimé");
        navigate("/suppliers");
      })
      .catch((e) => message.error(e instanceof Error ? e.message : "Erreur"));
  };

  const handlePayment = async () => {
    if (paymentAmount <= 0) {
      message.error(t.validation.amountMin);
      return;
    }
    try {
      await recordSupplierPayment(id, {
        amount: paymentAmount,
        paymentMethod: "cash",
      });
      message.success("Paiement enregistré");
      setPaymentOpen(false);
      setPaymentAmount(Math.abs(supplier.balance));
      fetchSupplier();
      fetchPayments();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      <div className={styles.backWrap}>
        <Button
          type="text"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate("/suppliers")}
        >
          {t.common.back}
        </Button>
      </div>

      {/* Hero summary card */}
      <Card bordered={false} className={styles.heroCard}>
        <div className={styles.heroInner}>
          <span className={styles.heroAvatar}>
            {getInitials(supplier.name)}
          </span>
          <div className={styles.heroInfo}>
            <Typography.Title level={4} className={styles.heroName}>
              {supplier.name}
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
            </div>
          </div>
          <div className={styles.heroBalance}>
            <span className={styles.heroBalanceLabel}>
              {t.suppliers.outstandingBalance}
            </span>
            <span
              className={styles.heroBalanceAmount}
              style={{ color: balanceColor }}
            >
              {supplier.balance.toLocaleString("fr-FR")} F
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              type="primary"
              icon={<Plus size={18} />}
              onClick={() => {
                setPaymentAmount(Math.abs(supplier.balance));
                setPaymentOpen(true);
              }}
            >
              {t.suppliers.addPayment}
            </Button>
            <Button
              icon={<Pencil size={18} />}
              onClick={() => setEditOpen(true)}
            >
              {t.common.edit}
            </Button>
            <Button
              danger
              icon={<Trash2 size={18} />}
              onClick={handleDelete}
            >
              {t.common.delete}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={t.suppliers.paymentHistory}
        bordered={false}
        className={`${styles.card} contentCard`}
      >
        {payments.length === 0 ? (
          <Typography.Text type="secondary">
            Aucun paiement enregistré
          </Typography.Text>
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
                  render: (v: number) => (
                    <Tag color="success">
                      +{v.toLocaleString("fr-FR")} F
                    </Tag>
                  ),
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
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder="Nom du fournisseur" />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t.common.phone}
            rules={[
              { pattern: /^[\d\s+()-]{0,20}$/, message: t.validation.phoneInvalid },
            ]}
          >
            <Input placeholder="33 123 45 67" />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.common.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item name="zone" label={t.common.zone}>
            <Input placeholder="ex. Zone 4, Dakar" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.suppliers.addPayment}
        open={paymentOpen}
        onOk={handlePayment}
        onCancel={() => setPaymentOpen(false)}
        okText={t.products.save}
      >
        <div style={{ marginTop: 16 }}>
          <div className={styles.paymentModalHeader}>
            <span className={styles.avatarMedium}>
              {getInitials(supplier.name)}
            </span>
            <div>
              <Typography.Text strong style={{ display: "block" }}>
                {supplier.name}
              </Typography.Text>
              <Typography.Text type="secondary">
                {t.suppliers.outstandingBalance}:{" "}
                <strong>
                  {supplier.balance.toLocaleString("fr-FR")} F
                </strong>
              </Typography.Text>
            </div>
          </div>
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label={t.expenses.amount}>
              <InputNumber
                min={1}
                value={paymentAmount}
                onChange={(v) => setPaymentAmount(Number(v) || 0)}
                addonAfter="F"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
