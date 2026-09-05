import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
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
  Tooltip,
} from "antd";
import { Plus, Search, Bike, Pencil, Trash2, PackageCheck } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Clients.module.css";
import {
  listCouriers,
  createCourier,
  updateCourier,
  deleteCourier,
  getCouriersStats,
  createDelivery,
} from "@/api";
import type { CourierResponse, CourierStatsResponse } from "@/api";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { EmptyState } from "@/components/EmptyState";

type CourierFilter = "all" | "active" | "inactive";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function livreursCountLabel(count: number) {
  if (count === 1) return t.livreurs.countOne;
  return t.livreurs.countOther.replace("{count}", String(count));
}

export default function Livreurs() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CourierFilter>("all");
  const [couriers, setCouriers] = useState<CourierResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<CourierResponse | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [deliveryForm] = Form.useForm();
  const [statsMap, setStatsMap] = useState<Record<string, CourierStatsResponse>>({});
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const { matrixCan } = useMatrixCan();

  const canCreate = matrixCan("DELIVERY_COURIERS_CREATE", "livreurs");
  const canUpdate = matrixCan("DELIVERY_COURIERS_UPDATE", "livreurs");
  const canDelete = matrixCan("DELIVERY_COURIERS_DELETE", "livreurs");

  const fetchCouriers = useCallback(async (isCancelled?: () => boolean) => {
    if (!localStorage.getItem("ecom360_access_token")) {
      if (!isCancelled?.()) setLoading(false);
      return;
    }
    if (!isCancelled?.()) setLoading(true);
    try {
      const [couriersRes, statsRes] = await Promise.all([
        listCouriers(false),
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
      if (!isCancelled?.()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchCouriers(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchCouriers]);

  const searched = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return couriers;
    return couriers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(search.trim())) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [couriers, search]);

  const filtered = useMemo(() => {
    if (filter === "active") return searched.filter((c) => c.isActive);
    if (filter === "inactive") return searched.filter((c) => !c.isActive);
    return searched;
  }, [searched, filter]);

  const pageStats = useMemo(() => {
    let activeCount = 0;
    let parcelsTotal = 0;
    for (const courier of filtered) {
      if (courier.isActive) activeCount += 1;
      parcelsTotal += statsMap[courier.id]?.totalParcelsDelivered ?? 0;
    }
    return { activeCount, parcelsTotal };
  }, [filtered, statsMap]);

  const hasActiveFilters = search !== "" || filter !== "all";
  const isCatalogEmpty = couriers.length === 0 && search === "" && filter === "all";

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };

  const onDelete = (courier: CourierResponse) => {
    Modal.confirm({
      title: t.common.delete,
      content: t.list.deleteConfirm.replace("{name}", courier.name),
      okText: t.list.deleteOk,
      okType: "danger",
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteCourier(courier.id);
          message.success(t.livreurs.msgDeleted);
          fetchCouriers();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        }
      },
    });
  };

  if (loading && couriers.length === 0 && !hasActiveFilters) {
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
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <Typography.Title level={4} className="pageTitle">
            {t.livreurs.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="pageSubtitle">
            {livreursCountLabel(couriers.length)}
          </Typography.Text>
        </div>
        <div className={styles.headerActions}>
          {canCreate ? (
            <>
              <Button
                icon={<PackageCheck size={16} />}
                onClick={() => {
                  deliveryForm.resetFields();
                  setDeliveryModalOpen(true);
                }}
              >
                {t.livreurs.recordDelivery}
              </Button>
              <Button type="primary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
                {t.livreurs.addCourier}
              </Button>
            </>
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
                  { id: "active" as const, label: t.livreurs.filterActive },
                  { id: "inactive" as const, label: t.livreurs.filterInactive },
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
              placeholder={t.livreurs.search}
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
            icon={Bike}
            title={t.livreurs.emptyTitle}
            description={t.livreurs.emptyDesc}
            action={
              canCreate ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<Bike size={16} />}
                  onClick={() => setAddOpen(true)}
                  style={{ height: 48 }}
                >
                  {t.livreurs.addCourier}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {filtered.length > 0 ? (
              <div className={styles.stats} aria-label={t.list.summaryPageHint}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{livreursCountLabel(filtered.length)}</span>
                  <span className={styles.statLabel}>{t.list.summaryPageHint}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{pageStats.activeCount}</span>
                  <span className={styles.statLabel}>{t.livreurs.filterActive}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{pageStats.parcelsTotal}</span>
                  <span className={styles.statLabel}>{t.livreurs.parcelsDelivered}</span>
                </div>
              </div>
            ) : null}
            {filtered.length === 0 ? (
              <EmptyState
                icon={Bike}
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
                {filtered.map((courier) => {
                  const meta = [courier.phone, courier.email].filter(Boolean).join(" · ");
                  const parcels = statsMap[courier.id]?.totalParcelsDelivered ?? 0;
                  const rate = Math.round(statsMap[courier.id]?.successRatePercent ?? 100);
                  return (
                    <li key={courier.id} className={styles.row}>
                      <div className={`${styles.identity} ${styles.identityStatic}`}>
                        <span className={styles.avatarSmall}>{getInitials(courier.name)}</span>
                        <span className={styles.identityText}>
                          <span className={styles.name}>{courier.name}</span>
                          {meta ? <span className={styles.meta}>{meta}</span> : null}
                        </span>
                      </div>
                      <div className={styles.statusCol}>
                        <span
                          className={`${styles.pill} ${
                            courier.isActive ? styles.pillOk : styles.pillMuted
                          }`}
                        >
                          {courier.isActive ? t.livreurs.active : t.livreurs.inactive}
                        </span>
                        <span className={styles.meta}>
                          {t.livreurs.parcelsMeta.replace("{count}", String(parcels))} · {rate}%
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
                                  name: courier.name,
                                  phone: courier.phone ?? "",
                                  email: courier.email ?? "",
                                  isActive: courier.isActive,
                                });
                                setEditOpen(courier);
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
                              onClick={() => onDelete(courier)}
                            />
                          </Tooltip>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </Card>

      <Modal
        title={t.livreurs.addCourier}
        open={addOpen}
        onOk={() => {
          addForm.validateFields().then(async (values) => {
            try {
              await createCourier({
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                isActive: values.isActive !== false,
              });
              message.success(t.livreurs.msgAdded);
              setAddOpen(false);
              addForm.resetFields();
              fetchCouriers();
            } catch (e) {
              message.error(e instanceof Error ? e.message : t.common.errorGeneric);
            }
          });
        }}
        onCancel={() => {
          setAddOpen(false);
          addForm.resetFields();
        }}
        okText={t.common.save}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.livreurs.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder={t.livreurs.placeholderCourierName} />
          </Form.Item>
          <Form.Item name="phone" label={t.livreurs.phone}>
            <Input placeholder={t.livreurs.placeholderPhoneExample} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.livreurs.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label={t.livreurs.status}
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren={t.livreurs.active} unCheckedChildren={t.livreurs.inactive} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.livreurs.editCourier}
        open={!!editOpen}
        onOk={() => {
          if (!editOpen) return;
          editForm.validateFields().then(async (values) => {
            try {
              await updateCourier(editOpen.id, {
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                isActive: values.isActive,
              });
              message.success(t.livreurs.msgUpdated);
              setEditOpen(null);
              editForm.resetFields();
              fetchCouriers();
            } catch (e) {
              message.error(e instanceof Error ? e.message : t.common.errorGeneric);
            }
          });
        }}
        onCancel={() => {
          setEditOpen(null);
          editForm.resetFields();
        }}
        okText={t.common.save}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.livreurs.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder={t.livreurs.placeholderCourierName} />
          </Form.Item>
          <Form.Item name="phone" label={t.livreurs.phone}>
            <Input placeholder={t.livreurs.placeholderPhoneExample} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.livreurs.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item name="isActive" label={t.livreurs.status} valuePropName="checked">
            <Switch checkedChildren={t.livreurs.active} unCheckedChildren={t.livreurs.inactive} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.livreurs.recordDelivery}
        open={deliveryModalOpen}
        onOk={() => {
          deliveryForm.validateFields().then(async (values) => {
            try {
              await createDelivery({
                courierId: values.courierId,
                status: values.status,
                parcelsCount: values.parcelsCount ?? 1,
                notes: values.notes || undefined,
              });
              message.success(t.livreurs.deliveryRecorded);
              setDeliveryModalOpen(false);
              deliveryForm.resetFields();
              fetchCouriers();
            } catch (e) {
              message.error(e instanceof Error ? e.message : t.common.errorGeneric);
            }
          });
        }}
        onCancel={() => {
          setDeliveryModalOpen(false);
          deliveryForm.resetFields();
        }}
        okText={t.common.save}
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
              options={couriers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label={t.livreurs.deliveryStatus}
            rules={[{ required: true }]}
            initialValue="delivered"
          >
            <Select
              options={[
                { value: "delivered", label: t.livreurs.delivered },
                { value: "failed", label: t.livreurs.failed },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="parcelsCount"
            label={t.livreurs.parcelsCount}
            initialValue={1}
            rules={[{ required: true }, { type: "number", min: 1, message: t.livreurs.minOne }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="notes" label={t.livreurs.note}>
            <Input.TextArea rows={2} placeholder={t.livreurs.optionalNotePlaceholder} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
