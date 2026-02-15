import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  Typography,
  Modal,
  InputNumber,
  Form,
  Skeleton,
  message,
} from "antd";
import {
  Plus,
  Search,
  UserPlus,
  Users,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";
import { t } from "@/i18n";
import styles from "./Clients.module.css";
import {
  listClients,
  createClient,
  recordClientPayment,
  updateClient,
  deleteClient,
  getSubscriptionUsage,
} from "@/api";
import { useStore } from "@/contexts/StoreContext";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Clients() {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [paymentModal, setPaymentModal] = useState<Client | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Client | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [clientsAtLimit, setClientsAtLimit] = useState(false);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) =>
        setClientsAtLimit(
          u.clientsLimit > 0 && u.clientsCount >= u.clientsLimit,
        ),
      )
      .catch(() => setClientsAtLimit(false));
  }, [clients.length]);

  const fetchClients = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listClients({ page: 0, size: 200 });
      setClients(
        res.content.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          address: c.address || "",
          balance: c.creditBalance ?? 0,
        })),
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase())),
  );

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 100, height: 28 }} />
          <div className={styles.toolbar}>
            <Skeleton.Input active style={{ width: 240, height: 44 }} />
            <Skeleton.Button active style={{ width: 160, height: 44 }} />
          </div>
        </div>
        <Card bordered={false} className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <Typography.Title level={4} className="pageTitle">
          {t.clients.title}
        </Typography.Title>
        <div className={styles.toolbar}>
          <Input
            prefix={<Search size={18} />}
            placeholder={t.products.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className={styles.toolbarSearch}
          />
          {clientsAtLimit ? (
            <Typography.Text type="secondary">
              Limite atteinte.{" "}
              <Link to="/settings/subscription">
                Passer à un plan supérieur
              </Link>
            </Typography.Text>
          ) : (
            <Button
              type="primary"
              icon={<Plus size={18} />}
              onClick={() => setAddClientOpen(true)}
            >
              {t.clients.addClient}
            </Button>
          )}
        </div>
      </header>
      <Card bordered={false} className={`${styles.card} contentCard`}>
        {clients.length === 0 ? (
          <div className={styles.emptyHero}>
            <div className={styles.emptyIconWrap}>
              <Users size={36} strokeWidth={1.5} />
            </div>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              Aucun client
            </Typography.Title>
            <Typography.Text
              type="secondary"
              style={{ maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}
            >
              Ajoutez vos clients pour suivre les crédits, les paiements et
              l'historique des achats.
            </Typography.Text>
            {!clientsAtLimit && (
              <Button
                type="primary"
                size="large"
                icon={<UserPlus size={16} />}
                onClick={() => setAddClientOpen(true)}
                style={{ marginTop: 20, height: 48 }}
              >
                Ajouter mon premier client
              </Button>
            )}
          </div>
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={filtered}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              onRow={(r) => ({
                style: { cursor: "pointer" },
                onClick: () => navigate(`/clients/${r.id}`),
              })}
              className="dataTable"
              locale={{ emptyText: "Aucun client trouvé" }}
              columns={[
                {
                  title: t.common.name,
                  dataIndex: "name",
                  render: (name: string) => (
                    <span className={styles.nameCell}>
                      <span className={styles.avatarSmall}>
                        {getInitials(name)}
                      </span>
                      {name}
                    </span>
                  ),
                },
                { title: t.common.phone, dataIndex: "phone" },
                { title: t.common.email, dataIndex: "email" },
                { title: t.common.address, dataIndex: "address" },
                {
                  title: t.clients.balance,
                  dataIndex: "balance",
                  sorter: (a: Client, b: Client) => a.balance - b.balance,
                  render: (v: number) => (
                    <Tag
                      color={v > 0 ? "success" : v < 0 ? "error" : "default"}
                    >
                      {v > 0 ? "+" : ""}
                      {v.toLocaleString("fr-FR")} F
                    </Tag>
                  ),
                },
                {
                  title: "",
                  width: 140,
                  render: (_, r: Client) => (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="text"
                        size="small"
                        icon={<Wallet size={14} />}
                        onClick={() => {
                          setPaymentModal(r);
                          setPaymentAmount(Math.abs(r.balance));
                        }}
                        aria-label={t.clients.addPayment}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<Pencil size={14} />}
                        onClick={() => {
                          editForm.setFieldsValue({
                            name: r.name,
                            phone: r.phone || "",
                            email: r.email || "",
                            address: r.address || "",
                          });
                          setEditOpen(r);
                        }}
                        aria-label={t.common.edit}
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<Trash2 size={14} />}
                        onClick={() => {
                          if (window.confirm(t.common.delete + " ?")) {
                            deleteClient(r.id)
                              .then(() => {
                                message.success("Client supprimé");
                                fetchClients();
                              })
                              .catch((e) =>
                                message.error(
                                  e instanceof Error ? e.message : "Erreur",
                                ),
                              );
                          }
                        }}
                        aria-label={t.common.delete}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Modal
        title={t.clients.addPayment}
        open={!!paymentModal}
        onCancel={() => setPaymentModal(null)}
        onOk={async () => {
          if (!paymentModal || paymentAmount <= 0 || !activeStore?.id) return;
          try {
            await recordClientPayment(paymentModal.id, {
              storeId: activeStore.id,
              amount: paymentAmount,
              paymentMethod: "cash",
            });
            message.success("Paiement enregistré");
            setPaymentModal(null);
            fetchClients();
          } catch (e) {
            message.error(e instanceof Error ? e.message : "Erreur");
          }
        }}
        okText={t.products.save}
      >
        {paymentModal && (
          <div style={{ marginTop: 16 }}>
            <div className={styles.paymentModalHeader}>
              <span className={styles.avatarMedium}>
                {getInitials(paymentModal.name)}
              </span>
              <div>
                <Typography.Text strong style={{ display: "block" }}>
                  {paymentModal.name}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {t.clients.outstandingBalance}:{" "}
                  <strong>
                    {paymentModal.balance.toLocaleString("fr-FR")} F
                  </strong>
                </Typography.Text>
              </div>
            </div>
            <Form layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item label="Montant">
                <InputNumber
                  min={0}
                  value={paymentAmount}
                  onChange={(v) => setPaymentAmount(Number(v) || 0)}
                  addonAfter="F"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title={t.clients.addClient}
        open={addClientOpen}
        onOk={() => {
          addForm.validateFields().then(async (values) => {
            try {
              await createClient({
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                address: values.address || undefined,
              });
              message.success("Client ajouté");
              setAddClientOpen(false);
              addForm.resetFields();
              fetchClients();
            } catch (e) {
              message.error(e instanceof Error ? e.message : "Erreur");
            }
          });
        }}
        onCancel={() => {
          setAddClientOpen(false);
          addForm.resetFields();
        }}
        okText={t.products.save}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
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
        title={t.clients.editClient}
        open={!!editOpen}
        onOk={() => {
          if (!editOpen) return;
          editForm.validateFields().then(async (values) => {
            try {
              await updateClient(editOpen.id, {
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                address: values.address || undefined,
              });
              message.success("Client mis à jour");
              setEditOpen(null);
              editForm.resetFields();
              fetchClients();
            } catch (e) {
              message.error(e instanceof Error ? e.message : "Erreur");
            }
          });
        }}
        onCancel={() => {
          setEditOpen(null);
          editForm.resetFields();
        }}
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
    </div>
  );
}
