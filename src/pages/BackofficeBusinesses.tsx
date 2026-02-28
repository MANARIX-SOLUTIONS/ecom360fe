import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  Table,
  Tag,
  Typography,
  Input,
  Button,
  Skeleton,
  Drawer,
  Modal,
  Select,
  Form,
  message,
  Space,
  Dropdown,
} from "antd";
import {
  Search,
  Building2,
  Store,
  MoreVertical,
  Eye,
  Trash2,
  Mail,
  CheckCircle,
  Plus,
  Pencil,
  CreditCard,
} from "lucide-react";
import styles from "./Backoffice.module.css";
import {
  listAdminBusinesses,
  setBusinessStatus,
  getAdminBusiness,
  createAdminBusiness,
  updateAdminBusiness,
  assignAdminBusinessPlan,
  listAdminPlans,
  type AdminBusiness,
  type AdminPlanItem,
} from "@/api/backoffice";

type Business = AdminBusiness & { stores: number };

const statusColors: Record<string, string> = {
  active: "success",
  suspended: "error",
  trial: "processing",
  expired: "default",
};
const statusLabels: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  trial: "Essai",
  expired: "Expiré",
};
const planColors: Record<string, string> = { Starter: "default", Pro: "blue", Business: "gold" };

export default function BackofficeBusinesses() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const resetPageRef = useRef(false);
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [detail, setDetail] = useState<Business | null>(null);
  const [modal, contextHolder] = Modal.useModal();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignPlanModalOpen, setAssignPlanModalOpen] = useState(false);
  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [assignPlanLoading, setAssignPlanLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [assignPlanForm] = Form.useForm();

  const loadPlans = useCallback(async () => {
    try {
      const list = await listAdminPlans();
      setPlans(list);
    } catch {
      setPlans([]);
    }
  }, []);

  const loadBusinesses = useCallback(async () => {
    const effectivePage = resetPageRef.current ? 0 : page;
    if (resetPageRef.current) {
      resetPageRef.current = false;
      setPage(0);
    }
    setLoading(true);
    try {
      const res = await listAdminBusinesses({
        page: effectivePage,
        size: pageSize,
        search: searchDebounced.trim() || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        plan: filterPlan !== "all" ? filterPlan : undefined,
      });
      const mapped: Business[] = (res.content || []).map((b) => ({
        ...b,
        id: b.id,
        stores: b.storesCount,
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "",
      }));
      setBusinesses(mapped);
      setTotal(res.totalElements ?? 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement entreprises");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, filterStatus, filterPlan]);

  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    resetPageRef.current = true;
  }, [searchDebounced, filterStatus, filterPlan]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const toggleSuspend = useCallback(
    (biz: Business) => {
      const nextStatus = biz.status === "suspended" ? "active" : "suspended";
      const verb = nextStatus === "suspended" ? "Suspendre" : "Réactiver";
      modal.confirm({
        title: `${verb} "${biz.name}" ?`,
        content:
          nextStatus === "suspended"
            ? "L'entreprise ne pourra plus accéder à la plateforme."
            : "L'entreprise retrouvera l'accès à la plateforme.",
        okText: verb,
        okButtonProps: { danger: nextStatus === "suspended" },
        cancelText: "Annuler",
        onOk: async () => {
          try {
            await setBusinessStatus(biz.id, nextStatus as "active" | "suspended");
            setBusinesses((prev) =>
              prev.map((b) => (b.id === biz.id ? { ...b, status: nextStatus } : b))
            );
            if (detail?.id === biz.id)
              setDetail((prev) => (prev ? { ...prev, status: nextStatus } : null));
            message.success(
              `"${biz.name}" ${nextStatus === "suspended" ? "suspendue" : "réactivée"}`
            );
          } catch (e) {
            message.error(e instanceof Error ? e.message : "Erreur");
          }
        },
      });
    },
    [modal, detail]
  );

  const handleContact = useCallback((biz: Business) => {
    window.location.href = `mailto:${biz.email}`;
  }, []);

  const refreshDetail = useCallback(async (id: string) => {
    try {
      const b = await getAdminBusiness(id);
      setDetail({
        ...b,
        stores: b.storesCount,
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "",
      });
      setBusinesses((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...b, stores: b.storesCount } : x))
      );
    } catch {
      // keep current detail
    }
  }, []);

  const detailIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!detail?.id) {
      detailIdRef.current = null;
      return;
    }
    if (detailIdRef.current === detail.id) return;
    detailIdRef.current = detail.id;
    refreshDetail(detail.id);
  }, [detail?.id, refreshDetail]);

  const openCreateModal = useCallback(() => {
    loadPlans();
    createForm.resetFields();
    setCreateModalOpen(true);
  }, [createForm, loadPlans]);

  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      const created = await createAdminBusiness({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
        planSlug: values.planSlug && values.planSlug !== "trial" ? values.planSlug : undefined,
      });
      message.success("Entreprise créée");
      setCreateModalOpen(false);
      createForm.resetFields();
      setDetail({
        ...created,
        stores: created.storesCount,
        createdAt: created.createdAt ? new Date(created.createdAt).toISOString().slice(0, 10) : "",
      });
      loadBusinesses();
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setCreateLoading(false);
    }
  }, [createForm, loadBusinesses]);

  const openEditModal = useCallback(() => {
    if (!detail) return;
    editForm.setFieldsValue({
      name: detail.name,
      email: detail.email,
      phone: detail.phone || "",
      address: detail.address || "",
    });
    setEditModalOpen(true);
  }, [detail, editForm]);

  const handleEdit = useCallback(async () => {
    if (!detail) return;
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      const updated = await updateAdminBusiness(detail.id, {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
      });
      message.success("Entreprise mise à jour");
      setEditModalOpen(false);
      setDetail({
        ...updated,
        stores: updated.storesCount,
        createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString().slice(0, 10) : "",
      });
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === detail.id ? { ...b, ...updated, stores: updated.storesCount } : b
        )
      );
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    } finally {
      setEditLoading(false);
    }
  }, [detail, editForm]);

  const openAssignPlanModal = useCallback(() => {
    if (!detail) return;
    loadPlans();
    assignPlanForm.setFieldsValue({ planSlug: undefined, billingCycle: "monthly" });
    setAssignPlanModalOpen(true);
  }, [detail, assignPlanForm, loadPlans]);

  const handleAssignPlan = useCallback(async () => {
    if (!detail) return;
    try {
      const values = await assignPlanForm.validateFields();
      setAssignPlanLoading(true);
      await assignAdminBusinessPlan(detail.id, {
        planSlug: values.planSlug,
        billingCycle: values.billingCycle || "monthly",
      });
      message.success("Plan mis à jour");
      setAssignPlanModalOpen(false);
      refreshDetail(detail.id);
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : "Erreur lors du changement de plan");
    } finally {
      setAssignPlanLoading(false);
    }
  }, [detail, assignPlanForm, refreshDetail]);

  if (loading) {
    return (
      <div className="pageWrapper">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      {contextHolder}
      <div className={styles.pageHeader}>
        <Typography.Title level={4} className={styles.pageTitle}>
          Entreprises
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.pageSubtitle}>
          {total} entreprise{total > 1 ? "s" : ""} inscrite{total > 1 ? "s" : ""} sur la plateforme
        </Typography.Text>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            prefix={<Search size={16} />}
            placeholder="Rechercher entreprise ou propriétaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className={styles.toolbarSearch}
          />
          <Select
            value={filterPlan}
            onChange={setFilterPlan}
            style={{ minWidth: 120 }}
            options={[
              { value: "all", label: "Tous les plans" },
              { value: "Starter", label: "Starter" },
              { value: "Pro", label: "Pro" },
              { value: "Business", label: "Business" },
            ]}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ minWidth: 120 }}
            options={[
              { value: "all", label: "Tous statuts" },
              { value: "active", label: "Actif" },
              { value: "suspended", label: "Suspendu" },
              { value: "trial", label: "Essai" },
            ]}
          />
        </div>
        <div className={styles.toolbarRight}>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
            Nouvelle entreprise
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card variant="borderless" className={styles.tableCard}>
        <div className="tableResponsive">
          <Table
            dataSource={businesses}
            rowKey="id"
            pagination={{
              current: page + 1,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (t) => `${t} entreprise${t > 1 ? "s" : ""}`,
              onChange: (p, s) => {
                setPage((p || 1) - 1);
                setPageSize(s || 10);
              },
            }}
            className="dataTable"
            onRow={(record) => ({ onClick: () => setDetail(record), style: { cursor: "pointer" } })}
            columns={[
              {
                title: "Entreprise",
                dataIndex: "name",
                sorter: (a: Business, b: Business) => a.name.localeCompare(b.name),
                render: (_: string, r: Business) => (
                  <div className={styles.nameCell}>
                    <span className={styles.nameCellIcon}>
                      <Building2 size={16} />
                    </span>
                    <div className={styles.nameCellInfo}>
                      <span className={styles.nameCellTitle}>{r.name}</span>
                      <span className={styles.nameCellSub}>{r.owner}</span>
                    </div>
                  </div>
                ),
              },
              {
                title: "Plan",
                dataIndex: "plan",
                width: 100,
                render: (plan: string) => <Tag color={planColors[plan]}>{plan}</Tag>,
              },
              {
                title: "Boutiques",
                dataIndex: "stores",
                width: 95,
                align: "center",
                sorter: (a: Business, b: Business) => a.stores - b.stores,
                render: (s: number) => (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <Store size={14} /> {s}
                  </span>
                ),
              },
              {
                title: "Revenu/mois",
                dataIndex: "revenue",
                width: 130,
                align: "right",
                render: (r: string) => <span className="amount">{r}</span>,
              },
              {
                title: "Statut",
                dataIndex: "status",
                width: 100,
                render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>,
              },
              {
                title: "",
                key: "actions",
                width: 48,
                align: "center",
                render: (_: unknown, r: Business) => (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "view",
                          icon: <Eye size={14} />,
                          label: "Détails",
                          onClick: () => setDetail(r),
                        },
                        { type: "divider" },
                        r.status === "suspended"
                          ? {
                              key: "activate",
                              icon: <CheckCircle size={14} />,
                              label: "Réactiver",
                              onClick: () => toggleSuspend(r),
                            }
                          : {
                              key: "suspend",
                              icon: <Trash2 size={14} />,
                              label: "Suspendre",
                              danger: true,
                              onClick: () => toggleSuspend(r),
                            },
                      ],
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 6,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </Dropdown>
                ),
              },
            ]}
          />
        </div>
      </Card>

      {/* Detail drawer */}
      <Drawer
        title={detail?.name ?? ""}
        open={!!detail}
        onClose={() => setDetail(null)}
        width={420}
      >
        {detail && (
          <>
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>Informations</span>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Propriétaire</span>
                <span className={styles.drawerValue}>{detail.owner}</span>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Email</span>
                <span className={styles.drawerValue}>{detail.email}</span>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Téléphone</span>
                <span className={styles.drawerValue}>{detail.phone}</span>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Adresse</span>
                <span className={styles.drawerValue}>{detail.address}</span>
              </div>
            </div>
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>Abonnement</span>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Plan</span>
                <Tag color={planColors[detail.plan]}>{detail.plan}</Tag>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Statut</span>
                <Tag color={statusColors[detail.status]}>{statusLabels[detail.status]}</Tag>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Inscription</span>
                <span className={styles.drawerValue}>
                  {new Date(detail.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>Activité</span>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Boutiques</span>
                <span className={styles.drawerValue}>{detail.stores}</span>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Revenu mensuel</span>
                <span className={styles.drawerValue}>{detail.revenue}</span>
              </div>
            </div>
            <Space style={{ width: "100%", marginTop: 16 }} direction="vertical">
              <Button block icon={<Pencil size={16} />} onClick={openEditModal}>
                Modifier l'entreprise
              </Button>
              <Button block icon={<CreditCard size={16} />} onClick={openAssignPlanModal}>
                Changer le plan
              </Button>
              <Button block icon={<Mail size={16} />} onClick={() => handleContact(detail)}>
                Contacter le propriétaire
              </Button>
              <Button
                block
                danger={detail.status !== "suspended"}
                type={detail.status === "suspended" ? "primary" : "default"}
                onClick={() => toggleSuspend(detail)}
              >
                {detail.status === "suspended"
                  ? "Réactiver l'entreprise"
                  : "Suspendre l'entreprise"}
              </Button>
            </Space>
          </>
        )}
      </Drawer>

      {/* Create business modal */}
      <Modal
        title="Nouvelle entreprise"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="Nom de l'entreprise"
            rules={[{ required: true, message: "Requis" }]}
          >
            <Input placeholder="Nom du commerce" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Requis" },
              { type: "email", message: "Email invalide" },
            ]}
          >
            <Input type="email" placeholder="contact@exemple.com" />
          </Form.Item>
          <Form.Item name="phone" label="Téléphone">
            <Input placeholder="33 123 45 67 89" />
          </Form.Item>
          <Form.Item name="address" label="Adresse">
            <Input.TextArea rows={2} placeholder="Adresse" />
          </Form.Item>
          <Form.Item name="planSlug" label="Plan" initialValue="trial">
            <Select
              placeholder="Choisir un plan"
              options={[
                { value: "trial", label: "Essai gratuit (30 jours)" },
                ...plans.map((p) => ({
                  value: p.slug,
                  label: `${p.name} (${p.priceMonthly} F/mois)`,
                })),
              ]}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                Créer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit business modal */}
      <Modal
        title="Modifier l'entreprise"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="name" label="Nom" rules={[{ required: true, message: "Requis" }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Requis" },
              { type: "email", message: "Email invalide" },
            ]}
          >
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="Téléphone">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Adresse">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space>
              <Button onClick={() => setEditModalOpen(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={editLoading}>
                Enregistrer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign plan modal */}
      <Modal
        title="Changer le plan"
        open={assignPlanModalOpen}
        onCancel={() => setAssignPlanModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={assignPlanForm} layout="vertical" onFinish={handleAssignPlan}>
          <Form.Item
            name="planSlug"
            label="Plan"
            rules={[{ required: true, message: "Choisir un plan" }]}
          >
            <Select
              placeholder="Choisir un plan"
              options={plans.map((p) => ({
                value: p.slug,
                label: `${p.name} — ${p.priceMonthly} F/mois, ${p.priceYearly} F/an`,
              }))}
            />
          </Form.Item>
          <Form.Item name="billingCycle" label="Facturation" initialValue="monthly">
            <Select
              options={[
                { value: "monthly", label: "Mensuelle" },
                { value: "yearly", label: "Annuelle" },
              ]}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space>
              <Button onClick={() => setAssignPlanModalOpen(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={assignPlanLoading}>
                Appliquer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
