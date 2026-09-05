import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Button,
  Input,
  Typography,
  Skeleton,
  Modal,
  Form,
  message,
  Pagination,
  Tooltip,
} from "antd";
import { Plus, Search, Truck, Pencil, Trash2 } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Clients.module.css";
import {
  listSuppliers,
  createSupplier,
  deleteSupplier,
  updateSupplier,
  getSubscriptionUsage,
} from "@/api";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { EmptyState } from "@/components/EmptyState";

type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  zone: string;
  balance: number;
};

type SupplierFilter = "all" | "due";

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

function suppliersCountLabel(count: number) {
  if (count === 1) return t.suppliers.countOne;
  return t.suppliers.countOther.replace("{count}", String(count));
}

export default function Suppliers() {
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();
  const [filter, setFilter] = useState<SupplierFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Supplier | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [suppliersAtLimit, setSuppliersAtLimit] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) =>
        setSuppliersAtLimit(
          u.suppliersLimit > 0 && u.suppliersCount >= u.suppliersLimit
        )
      )
      .catch(() => setSuppliersAtLimit(false));
  }, [suppliers.length]);

  const fetchSuppliers = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!localStorage.getItem("ecom360_access_token")) {
        if (!isCancelled?.()) setLoading(false);
        return;
      }
      if (!isCancelled?.()) setLoading(true);
      try {
        const res = await listSuppliers({
          page,
          size: pageSize,
          search: debouncedSearch || undefined,
        });
        if (isCancelled?.()) return;
        setSuppliers(
          res.content.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            email: c.email || "",
            zone: c.zone || "",
            balance: c.balance ?? 0,
          }))
        );
        setTotal(res.totalElements ?? 0);
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setSuppliers([]);
        setTotal(0);
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchSuppliers(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchSuppliers]);

  const pageStats = useMemo(() => {
    let dueCount = 0;
    let dueAmount = 0;
    for (const supplier of suppliers) {
      if (supplier.balance !== 0) {
        dueCount += 1;
        dueAmount += supplier.balance;
      }
    }
    return { dueCount, dueAmount };
  }, [suppliers]);

  const filtered = useMemo(
    () =>
      filter === "due"
        ? suppliers.filter((s) => s.balance !== 0)
        : suppliers,
    [suppliers, filter]
  );

  const hasActiveFilters = search !== "" || filter !== "all";
  const isCatalogEmpty =
    suppliers.length === 0 && search === "" && filter === "all";
  const canCreate = matrixCan("SUPPLIERS_CREATE", "suppliers");
  const canUpdate = matrixCan("SUPPLIERS_UPDATE", "suppliers");
  const canDelete = matrixCan("SUPPLIERS_DELETE", "suppliers");

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };

  const onDelete = (supplier: Supplier) => {
    Modal.confirm({
      title: t.common.delete,
      content: t.list.deleteConfirm.replace("{name}", supplier.name),
      okText: t.list.deleteOk,
      okType: "danger",
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteSupplier(supplier.id);
          message.success(t.suppliers.msgDeleted);
          fetchSuppliers();
        } catch (e) {
          message.error(
            e instanceof Error ? e.message : t.common.errorGeneric
          );
        }
      },
    });
  };

  if (loading && suppliers.length === 0 && !hasActiveFilters) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 130, height: 28 }} />
          <div className={styles.toolbar}>
            <Skeleton.Input active style={{ width: 240, height: 44 }} />
            <Skeleton.Button active style={{ width: 180, height: 44 }} />
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
            {t.suppliers.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="pageSubtitle">
            {suppliersCountLabel(total)}
          </Typography.Text>
        </div>
        <div className={styles.headerActions}>
          {suppliersAtLimit ? (
            <Typography.Text type="secondary">
              {t.list.limitReached}{" "}
              <Link to="/settings/subscription">{t.list.upgradePlan}</Link>
            </Typography.Text>
          ) : canCreate ? (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => setAddOpen(true)}
            >
              {t.suppliers.addSupplier}
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
                  { id: "due" as const, label: t.suppliers.filterDue },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={filter === chip.id}
                  className={`${styles.chip} ${
                    filter === chip.id ? styles.chipActive : ""
                  }`}
                  onClick={() => setFilter(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <Input
              prefix={<Search size={16} />}
              placeholder={t.suppliers.search}
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
            icon={Truck}
            title={t.suppliers.emptyTitle}
            description={t.suppliers.emptyDesc}
            action={
              !suppliersAtLimit && canCreate ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<Truck size={16} />}
                  onClick={() => setAddOpen(true)}
                  style={{ height: 48 }}
                >
                  {t.suppliers.emptyCta}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {suppliers.length > 0 ? (
              <>
                <div
                  className={styles.stats}
                  aria-label={t.list.summaryPageHint}
                >
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {suppliersCountLabel(suppliers.length)}
                    </span>
                    <span className={styles.statLabel}>
                      {t.list.summaryPageHint}
                    </span>
                  </div>
                  <div
                    className={`${styles.stat} ${
                      pageStats.dueCount > 0 ? styles.statWarn : ""
                    }`}
                  >
                    <span className={styles.statValue}>
                      {pageStats.dueCount}
                    </span>
                    <span className={styles.statLabel}>
                      {t.suppliers.filterDue}
                    </span>
                  </div>
                  <div
                    className={`${styles.stat} ${
                      pageStats.dueAmount !== 0 ? styles.statWarn : ""
                    }`}
                  >
                    <span className={styles.statValue}>
                      {formatAmount(pageStats.dueAmount)}
                    </span>
                    <span className={styles.statLabel}>
                      {t.suppliers.balance}
                    </span>
                  </div>
                </div>
                {pageStats.dueCount > 0 && filter === "all" ? (
                  <div className={styles.followUp}>
                    {(pageStats.dueCount === 1
                      ? t.suppliers.dueFollowUpOne
                      : t.suppliers.dueFollowUpOther
                    )
                      .replace("{count}", String(pageStats.dueCount))
                      .replace(
                        "{amount}",
                        formatAmount(pageStats.dueAmount)
                      )}
                  </div>
                ) : null}
              </>
            ) : null}
            {filtered.length === 0 ? (
              <EmptyState
                icon={Truck}
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
                {filtered.map((supplier) => {
                  const due = supplier.balance !== 0;
                  const meta = [supplier.phone, supplier.email, supplier.zone]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={supplier.id}
                      className={`${styles.row} ${due ? styles.rowDue : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.identity}
                        onClick={() => navigate(`/suppliers/${supplier.id}`)}
                        aria-label={t.suppliers.openAria.replace(
                          "{name}",
                          supplier.name
                        )}
                      >
                        <span className={styles.avatarSmall}>
                          {getInitials(supplier.name)}
                        </span>
                        <span className={styles.identityText}>
                          <span className={styles.name}>{supplier.name}</span>
                          {meta ? (
                            <span className={styles.meta}>{meta}</span>
                          ) : null}
                        </span>
                      </button>
                      <div className={styles.statusCol}>
                        <span
                          className={`${styles.pill} ${
                            due ? styles.pillWarn : styles.pillOk
                          }`}
                        >
                          {due
                            ? formatAmount(supplier.balance)
                            : t.suppliers.settled}
                        </span>
                      </div>
                      <div className={styles.actions}>
                        {canUpdate ? (
                          <Tooltip title={t.common.edit}>
                            <Button
                              type="text"
                              size="small"
                              aria-label={t.common.edit}
                              icon={<Pencil size={16} />}
                              onClick={() => {
                                editForm.setFieldsValue({
                                  name: supplier.name,
                                  phone: supplier.phone || "",
                                  email: supplier.email || "",
                                  zone: supplier.zone || "",
                                });
                                setEditOpen(supplier);
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
                              onClick={() => onDelete(supplier)}
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
                  showTotal={(count) => suppliersCountLabel(count)}
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
        title={t.suppliers.addSupplier}
        open={addOpen}
        onOk={() => {
          addForm.validateFields().then(async (values) => {
            try {
              await createSupplier({
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                zone: values.zone || undefined,
              });
              message.success(t.suppliers.msgAdded);
              setAddOpen(false);
              addForm.resetFields();
              fetchSuppliers();
            } catch (e) {
              message.error(
                e instanceof Error ? e.message : t.common.errorGeneric
              );
            }
          });
        }}
        onCancel={() => {
          setAddOpen(false);
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
            <Input placeholder={t.suppliers.placeholderSupplierName} />
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
        </Form>
      </Modal>

      <Modal
        title={t.suppliers.editSupplier}
        open={!!editOpen}
        onOk={() => {
          if (!editOpen) return;
          editForm.validateFields().then(async (values) => {
            try {
              await updateSupplier(editOpen.id, {
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                zone: values.zone || undefined,
              });
              message.success(t.suppliers.msgUpdated);
              setEditOpen(null);
              editForm.resetFields();
              fetchSuppliers();
            } catch (e) {
              message.error(
                e instanceof Error ? e.message : t.common.errorGeneric
              );
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
            <Input placeholder={t.suppliers.placeholderSupplierName} />
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
        </Form>
      </Modal>
    </div>
  );
}
