import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  Typography,
  Skeleton,
  Modal,
  Form,
  message,
  Switch,
  InputNumber,
  Select,
  Progress,
} from "antd";
import type { FormInstance } from "antd";
import { Plus, Search, Bike, Pencil, Trash2, PackageCheck } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Livreurs.module.css";
import {
  listCouriers,
  createCourier,
  updateCourier,
  deleteCourier,
  getCouriersStats,
  createDelivery,
} from "@/api";
import type { CourierResponse, CourierStatsResponse, DeliveryStatus } from "@/api";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, PageShell } from "@/components/ui";

type CourierFormValues = {
  name: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
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

function hasDeliveryActivity(stats?: CourierStatsResponse): stats is CourierStatsResponse {
  if (!stats) return false;
  return (stats.totalDeliveries ?? 0) > 0 || (stats.totalParcelsDelivered ?? 0) > 0;
}

function CourierFormFields({
  form,
  defaultActive,
}: {
  form: FormInstance<CourierFormValues>;
  defaultActive?: boolean;
}) {
  return (
    <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
      <Form.Item
        name="name"
        label={t.livreurs.name}
        rules={[{ required: true, message: t.validation.nameRequired }]}
      >
        <Input
          placeholder={t.livreurs.placeholderCourierName}
          autoComplete="name"
          autoCapitalize="words"
        />
      </Form.Item>
      <Form.Item name="phone" label={t.livreurs.phone}>
        <Input
          placeholder={t.livreurs.placeholderPhoneExample}
          inputMode="tel"
          autoComplete="tel"
        />
      </Form.Item>
      <Form.Item
        name="email"
        label={t.livreurs.email}
        rules={[{ type: "email", message: t.validation.email }]}
      >
        <Input placeholder={t.validation.emailPlaceholder} inputMode="email" autoComplete="email" />
      </Form.Item>
      <Form.Item
        name="isActive"
        label={t.livreurs.status}
        valuePropName="checked"
        initialValue={defaultActive ?? true}
      >
        <Switch checkedChildren={t.livreurs.active} unCheckedChildren={t.livreurs.inactive} />
      </Form.Item>
    </Form>
  );
}

export default function Livreurs() {
  const [search, setSearch] = useState("");
  const [couriers, setCouriers] = useState<CourierResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<CourierResponse | null>(null);
  const [addForm] = Form.useForm<CourierFormValues>();
  const [editForm] = Form.useForm<CourierFormValues>();
  const [deliveryForm] = Form.useForm();
  const [activeOnly, setActiveOnly] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, CourierStatsResponse>>({});
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const { matrixCan } = useMatrixCan();
  const canCreate = matrixCan("DELIVERY_COURIERS_CREATE", "livreurs");
  const canUpdate = matrixCan("DELIVERY_COURIERS_UPDATE", "livreurs");
  const canDelete = matrixCan("DELIVERY_COURIERS_DELETE", "livreurs");

  const fetchCouriers = useCallback(
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
        const [couriersRes, statsRes] = await Promise.all([
          listCouriers(activeOnly),
          getCouriersStats(),
        ]);
        if (isCancelled?.()) return;
        setCouriers(couriersRes);
        const map: Record<string, CourierStatsResponse> = {};
        statsRes.forEach((s) => {
          map[s.courierId] = s;
        });
        setStatsMap(map);
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setCouriers([]);
        setStatsMap({});
      } finally {
        if (!isCancelled?.()) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    },
    [activeOnly]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchCouriers(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchCouriers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return couriers;
    return couriers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [couriers, search]);

  const { totalParcels, avgEfficiency } = useMemo(() => {
    const listedStats = couriers
      .map((c) => statsMap[c.id])
      .filter((s): s is CourierStatsResponse => Boolean(s));
    const parcels = listedStats.reduce((sum, s) => sum + (s.totalParcelsDelivered ?? 0), 0);
    const withActivity = listedStats.filter(hasDeliveryActivity);
    if (withActivity.length === 0)
      return { totalParcels: parcels, avgEfficiency: null as number | null };
    const avg =
      withActivity.reduce((sum, s) => sum + (s.successRatePercent ?? 0), 0) / withActivity.length;
    return { totalParcels: parcels, avgEfficiency: Math.round(avg) };
  }, [couriers, statsMap]);

  const activeCouriers = useMemo(() => couriers.filter((c) => c.isActive), [couriers]);

  const openAdd = () => {
    addForm.resetFields();
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await addForm.validateFields();
    setAddSaving(true);
    try {
      await createCourier({
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        isActive: values.isActive !== false,
      });
      message.success(t.livreurs.msgAdded);
      setAddOpen(false);
      addForm.resetFields();
      void fetchCouriers();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setAddSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editOpen) return;
    const values = await editForm.validateFields();
    setEditSaving(true);
    try {
      await updateCourier(editOpen.id, {
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        isActive: values.isActive,
      });
      message.success(t.livreurs.msgUpdated);
      setEditOpen(null);
      editForm.resetFields();
      void fetchCouriers();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = (courier: CourierResponse) => {
    Modal.confirm({
      title: t.livreurs.deleteConfirmTitle,
      content: t.livreurs.deleteConfirmContent.replace("{name}", courier.name),
      okText: t.common.delete,
      okButtonProps: { danger: true },
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteCourier(courier.id);
          message.success(t.livreurs.msgDeleted);
          void fetchCouriers();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
          return Promise.reject(e);
        }
      },
    });
  };

  const submitDelivery = async () => {
    const values = await deliveryForm.validateFields();
    setDeliverySaving(true);
    try {
      await createDelivery({
        courierId: values.courierId,
        status: values.status as DeliveryStatus,
        parcelsCount: values.parcelsCount ?? 1,
        notes: values.notes?.trim() || undefined,
      });
      message.success(t.livreurs.deliveryRecorded);
      setDeliveryModalOpen(false);
      deliveryForm.resetFields();
      void fetchCouriers();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setDeliverySaving(false);
    }
  };

  const canRecordDelivery = activeCouriers.length > 0;
  const isCatalogEmpty = couriers.length === 0 && !activeOnly && !search.trim();
  const filterEmptyTitle = search.trim() ? t.livreurs.emptySearch : t.livreurs.emptyActiveOnly;

  const headerActions = canCreate ? (
    <div className={styles.toolbar}>
      <Button
        icon={<PackageCheck size={18} />}
        onClick={() => {
          deliveryForm.resetFields();
          setDeliveryModalOpen(true);
        }}
        disabled={!canRecordDelivery}
        title={!canRecordDelivery ? t.livreurs.recordNeedsActive : undefined}
      >
        {t.livreurs.recordDelivery}
      </Button>
      <Button type="primary" icon={<Plus size={18} />} onClick={openAdd}>
        {t.livreurs.addCourier}
      </Button>
    </div>
  ) : null;

  const filterBar = (
    <div className={styles.filterBar}>
      <Input
        prefix={<Search size={18} />}
        placeholder={t.livreurs.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        className={styles.searchInput}
      />
      <label className={styles.filterSwitch}>
        <Switch size="small" checked={activeOnly} onChange={setActiveOnly} />
        <span className={styles.filterSwitchLabel}>{t.livreurs.activeOnly}</span>
      </label>
    </div>
  );

  const header = (
    <PageHeader
      title={t.livreurs.title}
      subtitle={t.livreurs.list}
      meta={
        couriers.length > 0 ? (
          <>
            <Typography.Text type="secondary">
              {t.livreurs.metaParcels.replace("{count}", String(totalParcels))}
            </Typography.Text>
            {avgEfficiency != null ? (
              <Typography.Text type="secondary">
                {t.livreurs.metaEfficiency.replace("{pct}", String(avgEfficiency))}
              </Typography.Text>
            ) : null}
          </>
        ) : null
      }
      actions={headerActions}
    />
  );

  if (!hasLoaded && loading) {
    return (
      <PageShell className={styles.page}>
        {header}
        {filterBar}
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell className={styles.page}>
      {header}
      {filterBar}
      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {isCatalogEmpty ? (
          <EmptyState
            icon={Bike}
            title={t.livreurs.emptyTitle}
            description={t.livreurs.emptyDesc}
            action={
              canCreate ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<Bike size={16} />}
                  onClick={openAdd}
                  style={{ height: 48 }}
                >
                  {t.livreurs.addCourier}
                </Button>
              ) : null
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={Search} title={filterEmptyTitle} />
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={filtered}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              locale={{ emptyText: filterEmptyTitle }}
              className="dataTable"
              scroll={{ x: "max-content" }}
              columns={[
                {
                  title: t.livreurs.name,
                  dataIndex: "name",
                  render: (name: string) => (
                    <span className={styles.nameCell}>
                      <span className={styles.avatarSmall}>{getInitials(name)}</span>
                      {name}
                    </span>
                  ),
                },
                {
                  title: t.livreurs.phone,
                  dataIndex: "phone",
                  render: (v: string | null) =>
                    v ? <a href={`tel:${v.replace(/\s/g, "")}`}>{v}</a> : "—",
                },
                {
                  title: t.livreurs.email,
                  dataIndex: "email",
                  render: (v: string | null) => (v ? <a href={`mailto:${v}`}>{v}</a> : "—"),
                },
                {
                  title: t.livreurs.status,
                  dataIndex: "isActive",
                  width: 100,
                  render: (active: boolean) => (
                    <Tag color={active ? "green" : "default"}>
                      {active ? t.livreurs.active : t.livreurs.inactive}
                    </Tag>
                  ),
                },
                {
                  title: t.livreurs.parcelsDelivered,
                  key: "parcels",
                  width: 110,
                  sorter: (a: CourierResponse, b: CourierResponse) =>
                    (statsMap[a.id]?.totalParcelsDelivered ?? 0) -
                    (statsMap[b.id]?.totalParcelsDelivered ?? 0),
                  render: (_: unknown, r: CourierResponse) => (
                    <span className={styles.parcelsCell}>
                      {statsMap[r.id]?.totalParcelsDelivered ?? 0}
                    </span>
                  ),
                },
                {
                  title: t.livreurs.efficiency,
                  key: "efficiency",
                  width: 140,
                  sorter: (a: CourierResponse, b: CourierResponse) => {
                    const aStats = statsMap[a.id];
                    const bStats = statsMap[b.id];
                    const aRate = hasDeliveryActivity(aStats)
                      ? (aStats.successRatePercent ?? 0)
                      : -1;
                    const bRate = hasDeliveryActivity(bStats)
                      ? (bStats.successRatePercent ?? 0)
                      : -1;
                    return aRate - bRate;
                  },
                  render: (_: unknown, r: CourierResponse) => {
                    const stats = statsMap[r.id];
                    if (!hasDeliveryActivity(stats)) {
                      return (
                        <Typography.Text type="secondary">
                          {t.livreurs.noDeliveries}
                        </Typography.Text>
                      );
                    }
                    const rate = stats.successRatePercent ?? 0;
                    const status = rate >= 90 ? "success" : rate >= 70 ? "normal" : "exception";
                    return (
                      <Progress
                        percent={Math.round(rate)}
                        size="small"
                        status={status}
                        format={(p) => `${p}%`}
                      />
                    );
                  },
                },
                {
                  title: t.common.actions,
                  width: 100,
                  render: (_, r: CourierResponse) => (
                    <div role="group">
                      {canUpdate && (
                        <Button
                          type="text"
                          size="small"
                          icon={<Pencil size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            editForm.setFieldsValue({
                              name: r.name,
                              phone: r.phone ?? "",
                              email: r.email ?? "",
                              isActive: r.isActive,
                            });
                            setEditOpen(r);
                          }}
                          aria-label={t.common.edit}
                        />
                      )}
                      {canDelete && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<Trash2 size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(r);
                          }}
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
        title={t.livreurs.addCourier}
        open={addOpen}
        onOk={() => void submitAdd()}
        confirmLoading={addSaving}
        onCancel={() => {
          setAddOpen(false);
          addForm.resetFields();
        }}
        okText={t.common.save}
        cancelText={t.common.cancel}
        width="min(440px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <CourierFormFields form={addForm} defaultActive />
      </Modal>

      <Modal
        title={t.livreurs.editCourier}
        open={!!editOpen}
        onOk={() => void submitEdit()}
        confirmLoading={editSaving}
        onCancel={() => {
          setEditOpen(null);
          editForm.resetFields();
        }}
        okText={t.common.save}
        cancelText={t.common.cancel}
        width="min(440px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <CourierFormFields form={editForm} />
      </Modal>

      <Modal
        title={t.livreurs.recordDelivery}
        open={deliveryModalOpen}
        onOk={() => void submitDelivery()}
        confirmLoading={deliverySaving}
        onCancel={() => {
          setDeliveryModalOpen(false);
          deliveryForm.resetFields();
        }}
        okText={t.common.save}
        cancelText={t.common.cancel}
        width="min(440px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <Form form={deliveryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="courierId"
            label={t.livreurs.name}
            rules={[{ required: true, message: t.validation.requiredField }]}
          >
            <Select
              placeholder={t.livreurs.placeholderSelectCourier}
              showSearch
              optionFilterProp="label"
              options={activeCouriers.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label={t.livreurs.deliveryStatus}
            rules={[{ required: true, message: t.validation.requiredField }]}
            initialValue="delivered"
          >
            <Select
              options={[
                { value: "delivered", label: t.livreurs.delivered },
                { value: "failed", label: t.livreurs.failed },
                { value: "cancelled", label: t.livreurs.cancelled },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="parcelsCount"
            label={t.livreurs.parcelsCount}
            initialValue={1}
            rules={[
              { required: true, message: t.validation.requiredField },
              { type: "number", min: 1, message: t.livreurs.parcelsMin },
            ]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="notes" label={t.livreurs.note}>
            <Input.TextArea rows={2} placeholder={t.livreurs.optionalNotePlaceholder} />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
