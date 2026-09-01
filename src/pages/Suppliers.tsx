import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Table, Tag, Button, Input, Typography, Skeleton, Modal, Form, message } from "antd";
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
import { PageHeader, PageShell } from "@/components/ui";

type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  zone: string;
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

export default function Suppliers() {
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
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
        setSuppliersAtLimit(u.suppliersLimit > 0 && u.suppliersCount >= u.suppliersLimit)
      )
      .catch(() => setSuppliersAtLimit(false));
  }, [suppliers.length]);

  const fetchSuppliers = useCallback(
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
        if (!isCancelled?.()) setHasLoaded(true);
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setSuppliers([]);
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
    void fetchSuppliers(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchSuppliers]);

  const confirmDelete = (supplier: Supplier) => {
    Modal.confirm({
      title: t.suppliers.deleteConfirmTitle,
      content: t.suppliers.deleteConfirmContent.replace("{name}", supplier.name),
      okText: t.common.delete,
      okButtonProps: { danger: true },
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteSupplier(supplier.id);
          message.success(t.suppliers.msgDeleted);
          void fetchSuppliers();
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
      {suppliersAtLimit ? (
        <Typography.Text type="secondary">
          {t.products.limitReached} <Link to="/settings/subscription">{t.pos.upgradePlanLink}</Link>
        </Typography.Text>
      ) : matrixCan("SUPPLIERS_CREATE", "suppliers") ? (
        <Button type="primary" icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>
          {t.suppliers.addSupplier}
        </Button>
      ) : null}
    </div>
  );

  const filterBar = (
    <div className={styles.filterBar}>
      <Input
        prefix={<Search size={18} />}
        placeholder={t.suppliers.search}
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
        <PageHeader title={t.suppliers.title} actions={headerActions} />
        {filterBar}
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell className={styles.page}>
      <PageHeader title={t.suppliers.title} actions={headerActions} />
      {filterBar}

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {isCatalogEmpty ? (
          <EmptyState
            icon={Truck}
            title={t.suppliers.emptyTitle}
            description={t.suppliers.emptyDesc}
            action={
              !suppliersAtLimit && matrixCan("SUPPLIERS_CREATE", "suppliers") ? (
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
        ) : suppliers.length === 0 ? (
          <EmptyState compact icon={Search} title={t.suppliers.emptySearch} />
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={suppliers}
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
                onClick: () => navigate(`/suppliers/${r.id}`),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/suppliers/${r.id}`);
                  }
                },
              })}
              className="dataTable"
              locale={{ emptyText: t.suppliers.emptySearch }}
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
                { title: t.common.zone, dataIndex: "zone" },
                {
                  title: t.suppliers.balance,
                  dataIndex: "balance",
                  render: (v: number) => (
                    <Tag color={v < 0 ? "error" : "default"}>{v.toLocaleString("fr-FR")} F</Tag>
                  ),
                },
                {
                  title: "",
                  width: 100,
                  render: (_, r: Supplier) => (
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- stopPropagation only, not interactive
                    <div
                      role="group"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {matrixCan("SUPPLIERS_UPDATE", "suppliers") && (
                        <Button
                          type="text"
                          size="small"
                          icon={<Pencil size={14} />}
                          onClick={() => {
                            editForm.setFieldsValue({
                              name: r.name,
                              phone: r.phone || "",
                              email: r.email || "",
                              zone: r.zone || "",
                            });
                            setEditOpen(r);
                          }}
                          aria-label={t.common.edit}
                        />
                      )}
                      {matrixCan("SUPPLIERS_DELETE", "suppliers") && (
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
              message.error(e instanceof Error ? e.message : t.common.errorGeneric);
            }
          });
        }}
        onCancel={() => {
          setAddOpen(false);
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
              placeholder={t.suppliers.placeholderSupplierName}
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
              placeholder={t.suppliers.placeholderPhoneExample}
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
              placeholder={t.suppliers.placeholderSupplierName}
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
              placeholder={t.suppliers.placeholderPhoneExample}
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
          <Form.Item name="zone" label={t.common.zone}>
            <Input placeholder={t.suppliers.placeholderZoneExample} />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
