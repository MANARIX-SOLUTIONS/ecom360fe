import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Button,
  Input,
  Typography,
  Modal,
  Form,
  Skeleton,
  message,
  Pagination,
  Tooltip,
} from "antd";
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
import { canRecordClientPayment } from "@/utils/clientCredit";
import { isWalkInClientName } from "@/utils/clientWalkIn";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
};

type ClientFilter = "all" | "due";

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

function clientsCountLabel(count: number) {
  if (count === 1) return t.clients.countOne;
  return t.clients.countOther.replace("{count}", String(count));
}

export default function Clients() {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const { matrixCan } = useMatrixCan();
  const { canClientCredits } = usePlanFeatures();
  const [filter, setFilter] = useState<ClientFilter>("all");
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
        if (!isCancelled?.()) setLoading(false);
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
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setClients([]);
        setTotal(0);
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

  const pageStats = useMemo(() => {
    let dueCount = 0;
    let dueAmount = 0;
    for (const client of clients) {
      if (client.balance > 0) {
        dueCount += 1;
        dueAmount += client.balance;
      }
    }
    return { dueCount, dueAmount };
  }, [clients]);

  const filtered = useMemo(
    () => (filter === "due" ? clients.filter((c) => c.balance > 0) : clients),
    [clients, filter]
  );

  const hasActiveFilters = search !== "" || filter !== "all";
  const isCatalogEmpty = clients.length === 0 && search === "" && filter === "all";
  const canCreate = matrixCan("CLIENTS_CREATE", "clients");
  const canUpdate = matrixCan("CLIENTS_UPDATE", "clients");
  const canDelete = matrixCan("CLIENTS_DELETE", "clients");

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };

  const onDelete = (client: Client) => {
    Modal.confirm({
      title: t.common.delete,
      content: t.list.deleteConfirm.replace("{name}", client.name),
      okText: t.list.deleteOk,
      okType: "danger",
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteClient(client.id);
          message.success(t.clients.msgDeleted);
          fetchClients();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        }
      },
    });
  };

  if (loading && clients.length === 0 && !hasActiveFilters) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 100, height: 28 }} />
          <div className={styles.toolbar}>
            <Skeleton.Input active style={{ width: 240, height: 44 }} />
            <Skeleton.Button active style={{ width: 160, height: 44 }} />
          </div>
        </div>
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <Typography.Title level={4} className="pageTitle">
            {t.clients.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="pageSubtitle">
            {clientsCountLabel(total)}
          </Typography.Text>
        </div>
        <div className={styles.headerActions}>
          {clientsAtLimit ? (
            <Typography.Text type="secondary">
              {t.list.limitReached} <Link to="/settings/subscription">{t.list.upgradePlan}</Link>
            </Typography.Text>
          ) : canCreate ? (
            <Button type="primary" icon={<Plus size={16} />} onClick={() => setAddClientOpen(true)}>
              {t.clients.addClient}
            </Button>
          ) : null}
        </div>
      </header>

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {isCatalogEmpty ? null : (
          <div className={styles.toolbar}>
            <div className={styles.chips} role="group">
              {(
                [
                  { id: "all" as const, label: t.list.filterAll },
                  { id: "due" as const, label: t.clients.filterDue },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={filter === chip.id}
                  className={`${styles.chip} ${filter === chip.id ? styles.chipActive : ""}`}
                  onClick={() => setFilter(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <Input
              prefix={<Search size={16} />}
              placeholder={t.clients.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              className={styles.toolbarSearch}
            />
            {hasActiveFilters ? (
              <Button onClick={resetFilters}>{t.list.resetFilters}</Button>
            ) : null}
          </div>
        )}

        {isCatalogEmpty ? (
          <EmptyState
            icon={Users}
            title={t.clients.emptyTitle}
            description={t.clients.emptyDesc}
            action={
              !clientsAtLimit && canCreate ? (
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
        ) : (
          <>
            {clients.length > 0 ? (
              <>
                <div className={styles.stats} aria-label={t.list.summaryPageHint}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{clientsCountLabel(clients.length)}</span>
                    <span className={styles.statLabel}>{t.list.summaryPageHint}</span>
                  </div>
                  <div
                    className={`${styles.stat} ${pageStats.dueCount > 0 ? styles.statWarn : ""}`}
                  >
                    <span className={styles.statValue}>{pageStats.dueCount}</span>
                    <span className={styles.statLabel}>{t.clients.filterDue}</span>
                  </div>
                  <div
                    className={`${styles.stat} ${pageStats.dueAmount > 0 ? styles.statWarn : ""}`}
                  >
                    <span className={styles.statValue}>{formatAmount(pageStats.dueAmount)}</span>
                    <span className={styles.statLabel}>{t.clients.summaryDue}</span>
                  </div>
                </div>
                {pageStats.dueCount > 0 && filter === "all" ? (
                  <div className={styles.followUp}>
                    {(pageStats.dueCount === 1
                      ? t.clients.dueFollowUpOne
                      : t.clients.dueFollowUpOther
                    )
                      .replace("{count}", String(pageStats.dueCount))
                      .replace("{amount}", formatAmount(pageStats.dueAmount))}
                  </div>
                ) : null}
              </>
            ) : null}
            {filtered.length === 0 ? (
              <EmptyState
                icon={Users}
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
                {filtered.map((client) => {
                  const due = client.balance > 0;
                  const meta = [client.phone, client.email, client.address]
                    .filter(Boolean)
                    .join(" · ");
                  const canPay = canRecordClientPayment({
                    canClientCredits,
                    balance: client.balance,
                    isWalkIn: isWalkInClientName(client.name),
                  });
                  return (
                    <li key={client.id} className={`${styles.row} ${due ? styles.rowDue : ""}`}>
                      <button
                        type="button"
                        className={styles.identity}
                        onClick={() => navigate(`/clients/${client.id}`)}
                        aria-label={t.clients.openAria.replace("{name}", client.name)}
                      >
                        <span className={styles.avatarSmall}>{getInitials(client.name)}</span>
                        <span className={styles.identityText}>
                          <span className={styles.name}>{client.name}</span>
                          {meta ? <span className={styles.meta}>{meta}</span> : null}
                        </span>
                      </button>
                      <div className={styles.statusCol}>
                        <span className={`${styles.pill} ${due ? styles.pillWarn : styles.pillOk}`}>
                          {due
                            ? `${client.balance > 0 ? "" : ""}${formatAmount(client.balance)}`
                            : t.clients.settled}
                        </span>
                      </div>
                      <div className={styles.actions}>
                        {canPay && canUpdate ? (
                          <Tooltip title={t.clients.addPayment}>
                            <Button
                              type="primary"
                              size="small"
                              aria-label={t.clients.addPayment}
                              icon={<Wallet size={14} />}
                              onClick={() => {
                                setPaymentModal(client);
                                setPaymentAmount(client.balance);
                              }}
                            >
                              {t.clients.addPayment}
                            </Button>
                          </Tooltip>
                        ) : null}
                        {canUpdate ? (
                          <Tooltip title={t.common.edit}>
                            <Button
                              type="text"
                              size="small"
                              aria-label={t.common.edit}
                              icon={<Pencil size={16} />}
                              onClick={() => {
                                editForm.setFieldsValue({
                                  name: client.name,
                                  phone: client.phone || "",
                                  email: client.email || "",
                                  address: client.address || "",
                                });
                                setEditOpen(client);
                              }}
                            />
                          </Tooltip>
                        ) : null}
                        {canDelete ? (
                          <Tooltip title={t.common.delete}>
                            <Button
                              type="text"
                              size="small"
                              danger
                              aria-label={t.common.delete}
                              icon={<Trash2 size={16} />}
                              onClick={() => onDelete(client)}
                            />
                          </Tooltip>
                        ) : null}
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
                  showTotal={(count) => clientsCountLabel(count)}
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
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
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
    </div>
  );
}
