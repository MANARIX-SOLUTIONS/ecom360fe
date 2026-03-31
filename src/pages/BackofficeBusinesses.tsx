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
  Switch,
  Tooltip,
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
  Users,
  Shield,
  RefreshCw,
} from "lucide-react";
import styles from "./Backoffice.module.css";
import {
  listAdminBusinesses,
  setBusinessStatus,
  getAdminBusiness,
  createAdminBusiness,
  updateAdminBusiness,
  assignAdminBusinessPlan,
  renewAdminBusinessSubscription,
  listAdminPlans,
  listAdminBusinessMembers,
  listAdminBusinessRoleOptions,
  updateAdminBusinessMemberRole,
  updateAdminBusinessRolePermissions,
  listAdminBusinessStores,
  getAdminBusinessSubscriptionUsage,
  createAdminBusinessStore,
  updateAdminBusinessStore,
  deleteAdminBusinessStore,
  type AdminBusiness,
  type AdminPlanItem,
  type AdminBusinessMember,
  type AdminBusinessRoleOption,
} from "@/api/backoffice";
import { listPermissionCatalog, type PermissionCatalogItem } from "@/api/roles";
import { PermissionCatalogPicker } from "@/components/PermissionCatalogPicker";
import { labelForPermissionCode } from "@/utils/permissionCatalog";
import type { StoreResponse } from "@/api/stores";
import type { SubscriptionUsageResponse } from "@/api/subscription";
import { t } from "@/i18n";

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

const subscriptionStatusLabels: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  expired: "Expiré",
  cancelled: "Annulé",
  past_due: "Impayé",
  paused: "Suspendu",
  incomplete: "Incomplet",
};

function formatAdminDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

function subscriptionBillingLabel(cycle: string): string {
  if (cycle === "yearly") return "Annuelle";
  if (cycle === "monthly") return "Mensuelle";
  return cycle;
}

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
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [assignPlanLoading, setAssignPlanLoading] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [assignPlanForm] = Form.useForm();
  const [renewForm] = Form.useForm();
  const [members, setMembers] = useState<AdminBusinessMember[]>([]);
  const [roleOptions, setRoleOptions] = useState<AdminBusinessRoleOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [rolePermModalOpen, setRolePermModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminBusinessRoleOption | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [rolePermSaving, setRolePermSaving] = useState(false);
  const [permissionCatalogItems, setPermissionCatalogItems] = useState<PermissionCatalogItem[]>([]);
  const [adminStores, setAdminStores] = useState<StoreResponse[]>([]);
  const [storeUsage, setStoreUsage] = useState<SubscriptionUsageResponse | null>(null);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeForm] = Form.useForm();

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

  const loadMembersForBusiness = useCallback(async (businessId: string) => {
    setMembersLoading(true);
    try {
      const [m, r] = await Promise.all([
        listAdminBusinessMembers(businessId),
        listAdminBusinessRoleOptions(businessId),
      ]);
      setMembers(m);
      setRoleOptions(r);
    } catch {
      setMembers([]);
      setRoleOptions([]);
    } finally {
      setMembersLoading(false);
    }
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

  const loadStoresForBusiness = useCallback(async (businessId: string) => {
    setStoresLoading(true);
    try {
      const [stores, usage] = await Promise.all([
        listAdminBusinessStores(businessId),
        getAdminBusinessSubscriptionUsage(businessId),
      ]);
      setAdminStores(stores);
      setStoreUsage(usage);
    } catch {
      setAdminStores([]);
      setStoreUsage(null);
      message.error("Impossible de charger les boutiques");
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!detail?.id) {
      setAdminStores([]);
      setStoreUsage(null);
      return;
    }
    loadStoresForBusiness(detail.id);
  }, [detail?.id, loadStoresForBusiness]);

  const detailIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!detail?.id) {
      detailIdRef.current = null;
      setMembers([]);
      setRoleOptions([]);
      return;
    }
    if (detailIdRef.current === detail.id) return;
    detailIdRef.current = detail.id;
    refreshDetail(detail.id);
  }, [detail?.id, refreshDetail]);

  useEffect(() => {
    if (!detail?.id) return;
    loadMembersForBusiness(detail.id);
  }, [detail?.id, loadMembersForBusiness]);

  const handleMemberRoleChange = useCallback(
    async (businessUserId: string, roleCode: string) => {
      if (!detail?.id) return;
      setUpdatingMemberId(businessUserId);
      try {
        const updated = await updateAdminBusinessMemberRole(detail.id, businessUserId, roleCode);
        setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        message.success(
          "Rôle mis à jour. L'utilisateur peut devoir se reconnecter pour voir les changements."
        );
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Impossible de mettre à jour le rôle");
      } finally {
        setUpdatingMemberId(null);
      }
    },
    [detail?.id]
  );

  useEffect(() => {
    if (!detail?.id) {
      setPermissionCatalogItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const c = await listPermissionCatalog();
        if (!cancelled) setPermissionCatalogItems(c);
      } catch {
        if (!cancelled) message.error(t.backoffice.businessDrawer.catalogLoadError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail?.id]);

  const openRolePermissionsEditor = useCallback((r: AdminBusinessRoleOption) => {
    setEditingRole(r);
    setSelectedPerms([...r.permissions]);
    setRolePermModalOpen(true);
  }, []);

  const saveRolePermissions = useCallback(async () => {
    if (!detail?.id || !editingRole) return;
    setRolePermSaving(true);
    try {
      const updated = await updateAdminBusinessRolePermissions(
        detail.id,
        editingRole.id,
        selectedPerms
      );
      setRoleOptions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      await loadMembersForBusiness(detail.id);
      message.success(t.backoffice.businessDrawer.rolePermissionsSaved);
      setRolePermModalOpen(false);
      setEditingRole(null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setRolePermSaving(false);
    }
  }, [detail?.id, editingRole, selectedPerms, loadMembersForBusiness]);

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
      await refreshDetail(detail.id);
      await loadStoresForBusiness(detail.id);
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : "Erreur lors du changement de plan");
    } finally {
      setAssignPlanLoading(false);
    }
  }, [detail, assignPlanForm, loadStoresForBusiness, refreshDetail]);

  const openRenewModal = useCallback(async () => {
    if (!detail) return;
    try {
      const list = await listAdminPlans();
      setPlans(list);
      const slug = list.find((x) => x.name === detail.plan)?.slug;
      renewForm.setFieldsValue({
        planSlug: slug,
        billingCycle: "monthly",
      });
      setRenewModalOpen(true);
    } catch {
      message.error("Impossible de charger les plans");
    }
  }, [detail, renewForm]);

  const handleRenewSubscription = useCallback(async () => {
    if (!detail) return;
    try {
      const values = await renewForm.validateFields();
      setRenewLoading(true);
      await renewAdminBusinessSubscription(detail.id, {
        planSlug: values.planSlug as string | undefined,
        billingCycle: (values.billingCycle as string) || "monthly",
      });
      message.success("Abonnement renouvelé");
      setRenewModalOpen(false);
      await refreshDetail(detail.id);
      await loadStoresForBusiness(detail.id);
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : "Erreur lors du renouvellement");
    } finally {
      setRenewLoading(false);
    }
  }, [detail, renewForm, loadStoresForBusiness, refreshDetail]);

  const atStoreLimit =
    storeUsage != null &&
    storeUsage.storesLimit > 0 &&
    storeUsage.storesCount >= storeUsage.storesLimit;

  const openAddStore = useCallback(() => {
    setEditingStoreId(null);
    storeForm.resetFields();
    storeForm.setFieldsValue({ isActive: true });
    setStoreModalOpen(true);
  }, [storeForm]);

  const openEditStore = useCallback(
    (s: StoreResponse) => {
      setEditingStoreId(s.id);
      storeForm.setFieldsValue({
        name: s.name,
        address: s.address ?? "",
        phone: s.phone ?? "",
        isActive: s.isActive,
      });
      setStoreModalOpen(true);
    },
    [storeForm]
  );

  const handleStoreSubmit = useCallback(async () => {
    if (!detail?.id) return;
    try {
      const values = await storeForm.validateFields();
      setStoreSaving(true);
      const payload = {
        name: values.name as string,
        address: (values.address as string) || undefined,
        phone: (values.phone as string) || undefined,
        isActive: values.isActive !== false,
      };
      if (editingStoreId) {
        await updateAdminBusinessStore(detail.id, editingStoreId, payload);
        message.success("Boutique mise à jour");
      } else {
        await createAdminBusinessStore(detail.id, payload);
        message.success("Boutique créée");
      }
      setStoreModalOpen(false);
      storeForm.resetFields();
      await loadStoresForBusiness(detail.id);
      await refreshDetail(detail.id);
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setStoreSaving(false);
    }
  }, [detail?.id, editingStoreId, loadStoresForBusiness, refreshDetail, storeForm]);

  const handleDeleteStore = useCallback(
    (store: StoreResponse) => {
      if (!detail?.id) return;
      modal.confirm({
        title: `Supprimer « ${store.name} » ?`,
        content: "Cette action est irréversible.",
        okText: "Supprimer",
        okButtonProps: { danger: true },
        cancelText: "Annuler",
        onOk: async () => {
          try {
            await deleteAdminBusinessStore(detail.id, store.id);
            message.success("Boutique supprimée");
            await loadStoresForBusiness(detail.id);
            await refreshDetail(detail.id);
          } catch (e) {
            message.error(e instanceof Error ? e.message : "Erreur");
          }
        },
      });
    },
    [detail?.id, loadStoresForBusiness, modal, refreshDetail]
  );

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
                width: 148,
                render: (plan: string, r: Business) => (
                  <div>
                    <Tag color={planColors[plan]}>{plan}</Tag>
                    {r.subscription ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-muted)",
                          marginTop: 4,
                          lineHeight: 1.35,
                        }}
                      >
                        Fin {formatAdminDate(r.subscription.currentPeriodEnd)}
                        {r.subscription.trialing ? " · essai" : ""}
                        {r.subscription.cancelAtPeriodEnd ? " · fin résiliation" : ""}
                      </div>
                    ) : null}
                  </div>
                ),
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
        width={620}
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
              {detail.subscription ? (
                <>
                  <div className={styles.drawerRow}>
                    <span className={styles.drawerLabel}>Identifiant plan</span>
                    <span
                      className={styles.drawerValue}
                      style={{ fontFamily: "var(--font-mono, monospace)" }}
                    >
                      {detail.subscription.planSlug}
                    </span>
                  </div>
                  <div className={styles.drawerRow}>
                    <span className={styles.drawerLabel}>Facturation</span>
                    <span className={styles.drawerValue}>
                      {subscriptionBillingLabel(detail.subscription.billingCycle)}
                    </span>
                  </div>
                  <div className={styles.drawerRow}>
                    <span className={styles.drawerLabel}>Statut abonnement</span>
                    <Tag>
                      {subscriptionStatusLabels[detail.subscription.status] ??
                        detail.subscription.status}
                    </Tag>
                  </div>
                  <div className={styles.drawerRow}>
                    <span className={styles.drawerLabel}>Période</span>
                    <span className={styles.drawerValue}>
                      {formatAdminDate(detail.subscription.currentPeriodStart)} →{" "}
                      {formatAdminDate(detail.subscription.currentPeriodEnd)}
                    </span>
                  </div>
                  <div className={styles.drawerRow}>
                    <span className={styles.drawerLabel}>Jours restants (période)</span>
                    <span className={styles.drawerValue}>{detail.subscription.daysRemaining}</span>
                  </div>
                  {detail.subscription.cancelAtPeriodEnd ? (
                    <div className={styles.drawerRow}>
                      <span className={styles.drawerLabel}>Résiliation</span>
                      <Tag color="warning">En fin de période</Tag>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className={styles.drawerRow}>
                  <span className={styles.drawerLabel}>Détail plan</span>
                  <span className={styles.drawerValue} style={{ color: "var(--color-text-muted)" }}>
                    Aucun abonnement enregistré.
                  </span>
                </div>
              )}
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Statut entreprise</span>
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
                <span className={styles.drawerValue}>
                  {storeUsage
                    ? storeUsage.storesLimit === 0
                      ? `${storeUsage.storesCount} (illimité)`
                      : `${storeUsage.storesCount} / ${storeUsage.storesLimit}`
                    : detail.stores}
                </span>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Revenu mensuel</span>
                <span className={styles.drawerValue}>{detail.revenue}</span>
              </div>
            </div>
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>
                <Store size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Gestion des boutiques
              </span>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
                Les mêmes limites que pour le propriétaire dans Paramètres → Boutiques : création
                bloquée si le quota du plan est atteint.
              </Typography.Text>
              <div style={{ marginBottom: 10 }}>
                <Button
                  type="primary"
                  size="small"
                  icon={<Plus size={14} />}
                  disabled={atStoreLimit}
                  onClick={openAddStore}
                >
                  Ajouter une boutique
                </Button>
                {atStoreLimit && (
                  <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
                    Limite du plan atteinte — changez de plan pour ajouter des points de vente.
                  </Typography.Text>
                )}
              </div>
              {storesLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : adminStores.length === 0 ? (
                <Typography.Text type="secondary">Aucune boutique.</Typography.Text>
              ) : (
                <div className="tableResponsive">
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="id"
                    dataSource={adminStores}
                    columns={[
                      {
                        title: "Nom",
                        dataIndex: "name",
                        key: "name",
                      },
                      {
                        title: "Adresse",
                        dataIndex: "address",
                        key: "address",
                        ellipsis: true,
                        render: (a: string) => a || "—",
                      },
                      {
                        title: "Actif",
                        key: "active",
                        width: 72,
                        render: (_, row) => (
                          <Tag color={row.isActive ? "success" : "default"}>
                            {row.isActive ? "Oui" : "Non"}
                          </Tag>
                        ),
                      },
                      {
                        title: "",
                        key: "actions",
                        width: 88,
                        render: (_, row) => (
                          <Space size={4}>
                            <Button
                              type="link"
                              size="small"
                              icon={<Pencil size={14} />}
                              onClick={() => openEditStore(row)}
                            >
                              Modifier
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              danger
                              icon={<Trash2 size={14} />}
                              onClick={() => handleDeleteStore(row)}
                            >
                              Supprimer
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>
                <Shield size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                {t.backoffice.businessDrawer.rolesPermissionsTitle}
              </span>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
                {t.backoffice.businessDrawer.rolesPermissionsHelp}
              </Typography.Text>
              {membersLoading ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : roleOptions.length === 0 ? (
                <Typography.Text type="secondary">Aucun rôle.</Typography.Text>
              ) : (
                <div className="tableResponsive">
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="id"
                    dataSource={roleOptions}
                    columns={[
                      {
                        title: t.backoffice.businessDrawer.roleColumn,
                        key: "name",
                        render: (_, r) => (
                          <div>
                            <div>{r.name}</div>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {r.code}
                              {r.system ? (
                                <Tag style={{ marginLeft: 6 }} color="blue">
                                  {t.backoffice.businessDrawer.systemRoleTag}
                                </Tag>
                              ) : null}
                            </Typography.Text>
                          </div>
                        ),
                      },
                      {
                        title: t.backoffice.businessDrawer.rightsColumn,
                        key: "n",
                        width: 72,
                        align: "center",
                        render: (_, r) => (
                          <Tooltip
                            title={
                              r.permissions.length
                                ? r.permissions
                                    .map((c) => labelForPermissionCode(c, permissionCatalogItems))
                                    .join(", ")
                                : "—"
                            }
                          >
                            <span style={{ cursor: "help" }}>{r.permissions.length}</span>
                          </Tooltip>
                        ),
                      },
                      {
                        title: "",
                        key: "edit",
                        width: 100,
                        render: (_, r) => (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => openRolePermissionsEditor(r)}
                          >
                            {t.common.edit}
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>
                <Users size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                {t.backoffice.businessDrawer.teamTitle}
              </span>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                {t.backoffice.businessDrawer.teamHelp}
              </Typography.Text>
              {membersLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : members.length === 0 ? (
                <Typography.Text type="secondary">Aucun membre.</Typography.Text>
              ) : (
                <div className="tableResponsive">
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="id"
                    dataSource={members}
                    columns={[
                      {
                        title: t.backoffice.businessDrawer.memberColumn,
                        key: "name",
                        render: (_, m) => (
                          <div>
                            <div>{m.fullName}</div>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {m.email}
                            </Typography.Text>
                          </div>
                        ),
                      },
                      {
                        title: t.backoffice.businessDrawer.roleColumn,
                        key: "role",
                        width: 200,
                        render: (_, m) => (
                          <Select
                            size="small"
                            style={{ width: "100%" }}
                            value={m.roleCode}
                            loading={updatingMemberId === m.id}
                            options={roleOptions.map((r) => ({
                              value: r.code,
                              label: `${r.name} (${r.code})`,
                            }))}
                            onChange={(code) => handleMemberRoleChange(m.id, code)}
                          />
                        ),
                      },
                      {
                        title: t.backoffice.businessDrawer.rightsColumn,
                        key: "perms",
                        width: 72,
                        align: "center",
                        render: (_, m) => (
                          <Tooltip
                            title={
                              m.permissions?.length
                                ? m.permissions
                                    .map((c) => labelForPermissionCode(c, permissionCatalogItems))
                                    .join(", ")
                                : "—"
                            }
                          >
                            <span style={{ cursor: "help" }}>{m.permissions?.length ?? 0}</span>
                          </Tooltip>
                        ),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
            <Space style={{ width: "100%", marginTop: 16 }} direction="vertical">
              <Button block icon={<Pencil size={16} />} onClick={openEditModal}>
                Modifier l'entreprise
              </Button>
              <Button block icon={<CreditCard size={16} />} onClick={openAssignPlanModal}>
                Changer le plan
              </Button>
              <Tooltip
                title={
                  detail.plan === "-"
                    ? "Aucun abonnement connu — utilisez d'abord « Changer le plan »."
                    : undefined
                }
              >
                <span style={{ display: "block" }}>
                  <Button
                    block
                    icon={<RefreshCw size={16} />}
                    onClick={openRenewModal}
                    disabled={detail.plan === "-"}
                  >
                    Renouveler l'abonnement
                  </Button>
                </span>
              </Tooltip>
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
                { value: "trial", label: "Essai gratuit (14 jours)" },
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

      {/* Renew subscription modal */}
      <Modal
        title="Renouveler l'abonnement"
        open={renewModalOpen}
        onCancel={() => setRenewModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Ajoutez une période de facturation (mensuelle ou annuelle). Si l'entreprise a un
          abonnement payant encore actif, la nouvelle période commence à la fin de la période
          courante. Sinon, elle commence aujourd'hui (essai converti en payant immédiatement).
        </Typography.Paragraph>
        <Form form={renewForm} layout="vertical" onFinish={handleRenewSubscription}>
          <Form.Item
            name="planSlug"
            label="Plan"
            rules={[{ required: true, message: "Choisir un plan" }]}
          >
            <Select
              placeholder="Choisir un plan"
              options={plans.map((pl) => ({
                value: pl.slug,
                label: `${pl.name} — ${pl.priceMonthly} F/mois, ${pl.priceYearly} F/an`,
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
              <Button onClick={() => setRenewModalOpen(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={renewLoading}>
                Renouveler
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

      <Modal
        title={editingStoreId ? "Modifier la boutique" : "Nouvelle boutique"}
        open={storeModalOpen}
        onCancel={() => {
          setStoreModalOpen(false);
          storeForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={storeForm} layout="vertical" onFinish={handleStoreSubmit}>
          <Form.Item name="name" label="Nom" rules={[{ required: true, message: "Requis" }]}>
            <Input placeholder="Point de vente" />
          </Form.Item>
          <Form.Item name="address" label="Adresse">
            <Input.TextArea rows={2} placeholder="Adresse" />
          </Form.Item>
          <Form.Item name="phone" label="Téléphone">
            <Input placeholder="Optionnel" />
          </Form.Item>
          {editingStoreId ? (
            <Form.Item name="isActive" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : null}
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space>
              <Button
                onClick={() => {
                  setStoreModalOpen(false);
                  storeForm.resetFields();
                }}
              >
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={storeSaving}>
                {editingStoreId ? "Enregistrer" : "Créer"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingRole ? `${editingRole.name} (${editingRole.code})` : ""}
        open={rolePermModalOpen}
        onOk={() => void saveRolePermissions()}
        onCancel={() => {
          setRolePermModalOpen(false);
          setEditingRole(null);
        }}
        okText={t.common.save}
        confirmLoading={rolePermSaving}
        width={720}
        destroyOnClose
      >
        {permissionCatalogItems.length > 0 ? (
          <PermissionCatalogPicker
            catalog={permissionCatalogItems}
            selected={selectedPerms}
            onChange={setSelectedPerms}
          />
        ) : (
          <Typography.Text type="secondary">
            {t.backoffice.businessDrawer.catalogLoading}
          </Typography.Text>
        )}
      </Modal>
    </div>
  );
}
