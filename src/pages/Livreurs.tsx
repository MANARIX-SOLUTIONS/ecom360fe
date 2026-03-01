import { useState, useEffect, useCallback } from "react";
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
import { usePermissions } from "@/hooks/usePermissions";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Livreurs() {
  const [search, setSearch] = useState("");
  const [couriers, setCouriers] = useState<CourierResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<CourierResponse | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [deliveryForm] = Form.useForm();
  const [activeOnly, setActiveOnly] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, CourierStatsResponse>>({});
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const { can } = usePermissions();

  const fetchCouriers = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [couriersRes, statsRes] = await Promise.all([
        listCouriers(activeOnly),
        getCouriersStats(),
      ]);
      setCouriers(couriersRes);
      const map: Record<string, CourierStatsResponse> = {};
      statsRes.forEach((s) => {
        map[s.courierId] = s;
      });
      setStatsMap(map);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement");
      setCouriers([]);
      setStatsMap({});
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  const filtered = couriers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
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
        <Typography.Title level={4} className="pageTitle">
          {t.livreurs.title}
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
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Switch
              size="small"
              checked={!activeOnly}
              onChange={(checked) => setActiveOnly(!checked)}
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {activeOnly ? "Actifs uniquement" : "Tous"}
            </Typography.Text>
          </span>
          {can("DELIVERY_COURIERS_CREATE") && (
            <>
              <Button
                icon={<PackageCheck size={18} />}
                onClick={() => {
                  deliveryForm.resetFields();
                  setDeliveryModalOpen(true);
                }}
              >
                {t.livreurs.recordDelivery}
              </Button>
              <Button type="primary" icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>
                {t.livreurs.addCourier}
              </Button>
            </>
          )}
        </div>
      </header>
      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {couriers.length === 0 ? (
          <div className={styles.emptyHero}>
            <div className={styles.emptyIconWrap}>
              <Bike size={36} strokeWidth={1.5} />
            </div>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              {t.livreurs.emptyTitle}
            </Typography.Title>
            <Typography.Text
              type="secondary"
              style={{ maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}
            >
              {t.livreurs.emptyDesc}
            </Typography.Text>
            {can("DELIVERY_COURIERS_CREATE") && (
              <Button
                type="primary"
                size="large"
                icon={<Bike size={16} />}
                onClick={() => setAddOpen(true)}
                style={{ marginTop: 20, height: 48 }}
              >
                {t.livreurs.addCourier}
              </Button>
            )}
          </div>
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={filtered}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              className="dataTable"
              locale={{ emptyText: "Aucun livreur trouvé" }}
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
                  render: (v: string | null) => v ?? "-",
                },
                {
                  title: t.livreurs.email,
                  dataIndex: "email",
                  render: (v: string | null) => v ?? "-",
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
                    (statsMap[b.id]?.totalParcelsDelivered ?? 0) -
                    (statsMap[a.id]?.totalParcelsDelivered ?? 0),
                  render: (_: unknown, r: CourierResponse) => (
                    <span style={{ fontWeight: 500 }}>
                      {statsMap[r.id]?.totalParcelsDelivered ?? 0}
                    </span>
                  ),
                },
                {
                  title: t.livreurs.efficiency,
                  key: "efficiency",
                  width: 140,
                  sorter: (a: CourierResponse, b: CourierResponse) =>
                    (statsMap[a.id]?.successRatePercent ?? 100) -
                    (statsMap[b.id]?.successRatePercent ?? 100),
                  render: (_: unknown, r: CourierResponse) => {
                    const rate = statsMap[r.id]?.successRatePercent ?? 100;
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
                  title: "",
                  width: 100,
                  render: (_, r: CourierResponse) => (
                    <div role="group">
                      {can("DELIVERY_COURIERS_UPDATE") && (
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
                      {can("DELIVERY_COURIERS_DELETE") && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<Trash2 size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`${t.common.delete} "${r.name}" ?`)) {
                              deleteCourier(r.id)
                                .then(() => {
                                  message.success("Livreur supprimé");
                                  fetchCouriers();
                                })
                                .catch((err) =>
                                  message.error(err instanceof Error ? err.message : "Erreur")
                                );
                            }
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
        onOk={() => {
          addForm.validateFields().then(async (values) => {
            try {
              await createCourier({
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                isActive: values.isActive !== false,
              });
              message.success("Livreur ajouté");
              setAddOpen(false);
              addForm.resetFields();
              fetchCouriers();
            } catch (e) {
              message.error(e instanceof Error ? e.message : "Erreur");
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
            <Input placeholder="Nom du livreur" />
          </Form.Item>
          <Form.Item name="phone" label={t.livreurs.phone}>
            <Input placeholder="77 123 45 67" />
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
              message.success("Livreur mis à jour");
              setEditOpen(null);
              editForm.resetFields();
              fetchCouriers();
            } catch (e) {
              message.error(e instanceof Error ? e.message : "Erreur");
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
            <Input placeholder="Nom du livreur" />
          </Form.Item>
          <Form.Item name="phone" label={t.livreurs.phone}>
            <Input placeholder="77 123 45 67" />
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
              message.error(e instanceof Error ? e.message : "Erreur");
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
              placeholder="Choisir le livreur"
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
            rules={[{ required: true }, { type: "number", min: 1, message: "Min. 1" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="notes" label="Note">
            <Input.TextArea rows={2} placeholder="Optionnel" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
