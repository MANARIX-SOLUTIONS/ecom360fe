import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Table, Tag, Button, Input, Typography, Modal, Form, Skeleton, message } from "antd";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Plus, Search, UserPlus, Users, Pencil, Trash2, Wallet } from "lucide-react";
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
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, PageShell } from "@/components/ui";
import { canRecordClientPayment, creditBalanceTagColor } from "@/utils/clientCredit";
import { isWalkInClientName } from "@/utils/clientWalkIn";

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
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Clients() {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const { matrixCan } = useMatrixCan();
  const { canClientCredits } = usePlanFeatures();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [paymentModal, setPaymentModal] = useState<Client | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Client | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [clientsAtLimit, setClientsAtLimit] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) => setClientsAtLimit(u.clientsLimit > 0 && u.clientsCount >= u.clientsLimit))
      .catch(() => setClientsAtLimit(false));
  }, [clients.length]);

  const fetchClients = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!localStorage.getItem("ecom360_access_token")) {
        if (!isCancelled?.()) {
          setLoading(false);
          setHasLoaded(true);
        }
        return;
      }
      if (!isCancelled?.()) setLoading(true);
      try {
        const res = await listClients({
          page,
          size: pageSize,
          search: debouncedSearch || undefined,
        });
        if (isCancelled?.()) return;
        setClients(
          res.content.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            email: c.email || "",
            address: c.address || "",
            balance: c.creditBalance ?? 0,
          }))
        );
        setTotal(res.totalElements ?? 0);
        if (!isCancelled?.()) setHasLoaded(true);
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setClients([]);
        setTotal(0);
        setHasLoaded(true);
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchClients(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchClients]);

  const confirmDelete = (client: Client) => {
    Modal.confirm({
      title: t.clients.deleteConfirmTitle,
      content: t.clients.deleteConfirmContent.replace("{name}", client.name),
      okText: t.common.delete,
      okButtonProps: { danger: true },
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteClient(client.id);
          message.success(t.clients.msgDeleted);
          void fetchClients();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
          return Promise.reject(e);
        }
      },
    });
  };

  const isCatalogEmpty = total === 0 && !search.trim();

  const headerActions = (
    <div className={styles.toolbar}>
      {clientsAtLimit ? (
        <Typography.Text type="secondary">
          {t.products.limitReached} <Link to="/settings/subscription">{t.pos.upgradePlanLink}</Link>
        </Typography.Text>
      ) : matrixCan("CLIENTS_CREATE", "clients") ? (
        <Button type="primary" icon={<Plus size={18} />} onClick={() => setAddClientOpen(true)}>
          {t.clients.addClient}
        </Button>
      ) : null}
    </div>
  );

  const filterBar = (
    <div className={styles.filterBar}>
      <Input
        prefix={<Search size={18} />}
        placeholder={t.clients.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        className={styles.searchInput}
      />
    </div>
  );

  if (!hasLoaded && loading) {
    return (
      <PageShell className={styles.page}>
        <PageHeader title={t.clients.title} actions={headerActions} />
        {filterBar}
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell className={styles.page}>
      <PageHeader title={t.clients.title} actions={headerActions} />
      {filterBar}

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {isCatalogEmpty ? (
          <EmptyState
            icon={Users}
            title={t.clients.emptyTitle}
            description={t.clients.emptyDesc}
            action={
              !clientsAtLimit && matrixCan("CLIENTS_CREATE", "clients") ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<UserPlus size={16} />}
                  onClick={() => setAddClientOpen(true)}
                  style={{ height: 48 }}
                >
                  {t.clients.emptyCta}
                </Button>
              ) : null
            }
          />
        ) : clients.length === 0 ? (
          <EmptyState compact icon={Search} title={t.clients.emptySearch} />
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={clients}
              rowKey="id"
              loading={loading}
              scroll={{ x: "max-content" }}
              pagination={{
                current: page + 1,
                pageSize,
                total,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50"],
                onChange: (p, size) => {
                  setPage(p - 1);
                  setPageSize(size);
                },
              }}
              onRow={(r) => ({
                style: { cursor: "pointer" },
                role: "button",
                tabIndex: 0,
                onClick: () => navigate(`/clients/${r.id}`),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/clients/${r.id}`);
                  }
                },
              })}
              className="dataTable"
              locale={{ emptyText: t.clients.emptySearch }}
              columns={[
                {
                  title: t.common.name,
                  dataIndex: "name",
                  render: (name: string) => (
                    <span className={styles.nameCell}>
                      <span className={styles.avatarSmall}>{getInitials(name)}</span>
                      {name}
                    </span>
                  ),
                },
                {
                  title: t.common.phone,
                  dataIndex: "phone",
                  render: (v: string) =>
                    v ? <a href={`tel:${v.replace(/\s/g, "")}`}>{v}</a> : "—",
                },
                {
                  title: t.common.email,
                  dataIndex: "email",
                  render: (v: string) => (v ? <a href={`mailto:${v}`}>{v}</a> : "—"),
                },
                { title: t.common.address, dataIndex: "address" },
                {
                  title: t.clients.balance,
                  dataIndex: "balance",
                  sorter: (a: Client, b: Client) => a.balance - b.balance,
                  render: (v: number) => (
                    <Tag color={creditBalanceTagColor(v)}>
                      {v > 0 ? "+" : ""}
                      {v.toLocaleString("fr-FR")} F
                    </Tag>
                  ),
                },
                {
                  title: "",
                  width: 140,
                  render: (_, r: Client) => (
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- stopPropagation only, not interactive
                    <div
                      role="group"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {canRecordClientPayment({
                        canClientCredits,
                        balance: r.balance,
                        isWalkIn: isWalkInClientName(r.name),
                      }) &&
                        matrixCan("CLIENTS_UPDATE", "clients") && (
                          <Button
                            type="text"
                            size="small"
                            icon={<Wallet size={14} />}
                            onClick={() => {
                              setPaymentModal(r);
                              setPaymentAmount(r.balance);
                            }}
                            aria-label={t.clients.addPayment}
                          />
                        )}
                      {matrixCan("CLIENTS_UPDATE", "clients") && (
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
                      )}
                      {matrixCan("CLIENTS_DELETE", "clients") && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<Trash2 size={14} />}
                          onClick={() => confirmDelete(r)}
                          aria-label={t.common.delete}
                        />
                      )}
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
          if (!paymentModal) return;
          if (!activeStore?.id) {
            message.error(t.clients.paymentNeedsActiveStore);
            return;
          }
          if (paymentAmount <= 0) {
            message.error(t.validation.amountMin);
            return;
          }
          if (paymentAmount > paymentModal.balance) {
            message.error(t.clients.paymentExceedsBalance);
            return;
          }
          try {
            await recordClientPayment(paymentModal.id, {
              storeId: activeStore.id,
              amount: paymentAmount,
              paymentMethod: "cash",
            });
            message.success(t.common.paymentRecorded);
            setPaymentModal(null);
            fetchClients();
          } catch (e) {
            message.error(e instanceof Error ? e.message : t.common.errorGeneric);
          }
        }}
        okText={t.products.save}
        width="min(440px, calc(100vw - 32px))"
        destroyOnHidden
      >
        {paymentModal && (
          <div style={{ marginTop: 16 }}>
            <div className={styles.paymentModalHeader}>
              <span className={styles.avatarMedium}>{getInitials(paymentModal.name)}</span>
              <div>
                <Typography.Text strong style={{ display: "block" }}>
                  {paymentModal.name}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {t.clients.outstandingBalance}:{" "}
                  <strong>{paymentModal.balance.toLocaleString("fr-FR")} F</strong>
                </Typography.Text>
              </div>
            </div>
            <Form layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item label={t.expenses.amount}>
                <CurrencyInput
                  min={1}
                  max={paymentModal.balance}
                  value={paymentAmount}
                  onChange={(v) => setPaymentAmount(Number(v) || 0)}
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
              message.success(t.clients.msgAdded);
              setAddClientOpen(false);
              addForm.resetFields();
              fetchClients();
            } catch (e) {
              message.error(e instanceof Error ? e.message : t.common.errorGeneric);
            }
          });
        }}
        onCancel={() => {
          setAddClientOpen(false);
          addForm.resetFields();
        }}
        okText={t.products.save}
        width="min(440px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input
              placeholder={t.clients.placeholderClientName}
              autoComplete="name"
              autoCapitalize="words"
            />
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
            <Input
              placeholder={t.clients.placeholderPhoneExample}
              inputMode="tel"
              autoComplete="tel"
            />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.common.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input
              placeholder={t.validation.emailPlaceholder}
              inputMode="email"
              autoComplete="email"
            />
          </Form.Item>
          <Form.Item name="address" label={t.common.address}>
            <Input placeholder={t.clients.placeholderAddress} />
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
              message.success(t.clients.msgUpdated);
              setEditOpen(null);
              editForm.resetFields();
              fetchClients();
            } catch (e) {
              message.error(e instanceof Error ? e.message : t.common.errorGeneric);
            }
          });
        }}
        onCancel={() => {
          setEditOpen(null);
          editForm.resetFields();
        }}
        okText={t.products.save}
        width="min(440px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input
              placeholder={t.clients.placeholderClientName}
              autoComplete="name"
              autoCapitalize="words"
            />
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
            <Input
              placeholder={t.clients.placeholderPhoneExample}
              inputMode="tel"
              autoComplete="tel"
            />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.common.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input
              placeholder={t.validation.emailPlaceholder}
              inputMode="email"
              autoComplete="email"
            />
          </Form.Item>
          <Form.Item name="address" label={t.common.address}>
            <Input placeholder={t.clients.placeholderAddress} />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
