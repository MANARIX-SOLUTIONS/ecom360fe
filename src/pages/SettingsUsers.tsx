import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  message,
  Spin,
  Progress,
  Space,
} from "antd";
import { ArrowLeft, Plus, User, UserMinus, Store } from "lucide-react";
import { t } from "@/i18n";
import { ROLES } from "@/constants/roles";
import {
  listBusinessUsers,
  inviteBusinessUser,
  deactivateBusinessUser,
  getSubscriptionUsage,
  invalidateSubscriptionUsageCache,
  getAssignedStores,
  assignStores,
  listAssignableStores,
  listRoles,
} from "@/api";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import type { BusinessUser, SubscriptionUsageResponse } from "@/api";
import type { BusinessRoleDto } from "@/api/roles";
import type { StoreResponse } from "@/api/stores";
import styles from "./Settings.module.css";

const BASE_ROLE_OPTIONS = [
  { value: ROLES.CAISSIER, label: t.roles.cashier },
  { value: ROLES.GESTIONNAIRE, label: t.roles.manager },
];

function roleToLabel(role: string, roleName?: string): string {
  if (roleName) return roleName;
  const r = role?.toLowerCase();
  if (r === "admin" || r === "proprietaire") return t.roles.owner;
  if (r === "manager" || r === "gestionnaire") return t.roles.manager;
  if (r === "seller" || r === "caissier") return t.roles.cashier;
  return role || "—";
}

function isOwnerRole(role: string | undefined): boolean {
  const r = role?.toLowerCase() ?? "";
  return r === "admin" || r === "proprietaire" || r === "propriétaire";
}

type SeatTone = "ok" | "warn" | "full" | "unlimited";

function seatTone(usage: SubscriptionUsageResponse): SeatTone {
  if (usage.usersLimit <= 0) return "unlimited";
  const remaining = usage.usersLimit - usage.usersCount;
  if (remaining <= 0) return "full";
  if (remaining === 1) return "warn";
  return "ok";
}

function seatsTitle(usage: SubscriptionUsageResponse): string {
  if (usage.usersLimit <= 0) return t.settings.seatsUnlimited;
  return t.settings.seatsUsedTpl
    .replace("{count}", String(usage.usersCount))
    .replace("{limit}", String(usage.usersLimit));
}

function seatsDetail(usage: SubscriptionUsageResponse): string {
  if (usage.usersLimit <= 0) return t.settings.seatsInviteUnlimited;
  const remaining = Math.max(0, usage.usersLimit - usage.usersCount);
  if (remaining === 0) return t.settings.seatsLimitReached;
  if (remaining === 1) return t.settings.seatsRemainingOne;
  return t.settings.seatsRemainingMany.replace("{n}", String(remaining));
}

export default function SettingsUsers() {
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();
  const { canSettingsUsers } = usePlanFeatures();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form] = Form.useForm();
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [usage, setUsage] = useState<SubscriptionUsageResponse | null>(null);
  const [customRoles, setCustomRoles] = useState<BusinessRoleDto[]>([]);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<BusinessUser | null>(null);
  const [assignForm] = Form.useForm();
  const [assignLoading, setAssignLoading] = useState(false);
  const [stores, setStores] = useState<StoreResponse[]>([]);

  const usersAtLimit =
    usage != null && usage.usersLimit > 0 && usage.usersCount >= usage.usersLimit;
  const canInvite = matrixCan("BUSINESS_USERS_CREATE", "settings:users");
  const canAssignStores = matrixCan("BUSINESS_USERS_UPDATE", "settings:users");
  const canRemove = matrixCan("BUSINESS_USERS_DELETE", "settings:users");

  const roleOptions = useMemo(() => {
    if (!canSettingsUsers) return BASE_ROLE_OPTIONS;
    const extra = customRoles
      .filter((role) => !role.system && role.code.toUpperCase() !== "PROPRIETAIRE")
      .map((role) => ({ value: role.code, label: role.name }));
    return [...BASE_ROLE_OPTIONS, ...extra];
  }, [canSettingsUsers, customRoles]);

  const reloadUsers = () =>
    listBusinessUsers()
      .then(setUsers)
      .catch(() => message.error(t.settings.usersLoadError));

  useEffect(() => {
    reloadUsers().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    invalidateSubscriptionUsageCache();
    getSubscriptionUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [users.length]);

  useEffect(() => {
    if (!canSettingsUsers) {
      setCustomRoles([]);
      return;
    }
    listRoles()
      .then((roles) =>
        setCustomRoles(
          roles.filter((role) => !role.system && role.code.toUpperCase() !== "PROPRIETAIRE")
        )
      )
      .catch(() => setCustomRoles([]));
  }, [canSettingsUsers]);

  const openAssignModal = async (user: BusinessUser) => {
    setAssignUser(user);
    setAssignModalOpen(true);
    setAssignLoading(true);
    try {
      const [storesList, assigned] = await Promise.all([
        listAssignableStores(),
        getAssignedStores(user.id),
      ]);
      setStores(storesList);
      assignForm.setFieldsValue({ storeIds: assigned.map((s) => s.id) });
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.settings.storesLoadForAssignmentError);
      setAssignModalOpen(false);
      setAssignUser(null);
    } finally {
      setAssignLoading(false);
    }
  };

  const onAssignStores = async () => {
    if (!assignUser) return;
    try {
      const values = assignForm.getFieldsValue();
      const storeIds = (values.storeIds ?? []) as string[];
      await assignStores(assignUser.id, storeIds);
      message.success(t.settings.storesAssignmentUpdated);
      setAssignModalOpen(false);
      setAssignUser(null);
      assignForm.resetFields();
      await reloadUsers();
    } catch (e) {
      if (e instanceof Error && e.message?.includes("required")) return;
      message.error(e instanceof Error ? e.message : t.settings.storesAssignmentUpdateError);
    }
  };

  const onInvite = async () => {
    try {
      await form.validateFields();
      setInviting(true);
      const values = form.getFieldsValue();
      await inviteBusinessUser({ email: values.email, role: values.role });
      setInviteOpen(false);
      form.resetFields();
      message.success(t.settings.invitationSentSuccess);
      invalidateSubscriptionUsageCache();
      await reloadUsers();
    } catch (e) {
      if (e instanceof Error && e.message?.includes("required")) return;
      message.error(e instanceof Error ? e.message : t.settings.invitationSendError);
    } finally {
      setInviting(false);
    }
  };

  const confirmRemove = (user: BusinessUser) => {
    Modal.confirm({
      title: t.settings.removeMemberTitle.replace("{name}", user.fullName),
      content: t.settings.removeMemberDesc,
      okText: t.settings.removeMember,
      okButtonProps: { danger: true },
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deactivateBusinessUser(user.id);
          message.success(t.settings.removeMemberSuccess.replace("{name}", user.fullName));
          invalidateSubscriptionUsageCache();
          await reloadUsers();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.settings.removeMemberError);
          return Promise.reject(e);
        }
      },
    });
  };

  const tone = usage ? seatTone(usage) : null;
  const bannerClass =
    tone === "full"
      ? `${styles.seatsBanner} ${styles.seatsBannerFull}`
      : tone === "warn"
        ? `${styles.seatsBanner} ${styles.seatsBannerWarn}`
        : styles.seatsBanner;
  const seatPercent =
    usage && usage.usersLimit > 0
      ? Math.min(100, Math.round((usage.usersCount / usage.usersLimit) * 100))
      : 0;

  return (
    <div className={`${styles.settingsPage} ${styles.settingsPageWide} pageWrapper`}>
      <button type="button" className={styles.settingsBack} onClick={() => navigate("/settings")}>
        <ArrowLeft size={18} />
        {t.common.back}
      </button>

      <header className={styles.settingsPageHeader}>
        <div className={styles.toolbar}>
          <div>
            <Typography.Title level={4} className={styles.settingsPageTitle}>
              {t.settings.usersAndRoles}
            </Typography.Title>
            <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
              {t.settings.usersAndRolesDesc}
            </Typography.Text>
          </div>
          {canInvite ? (
            <Button
              type="primary"
              icon={<Plus size={18} />}
              disabled={usersAtLimit}
              onClick={() => setInviteOpen(true)}
            >
              {t.settings.inviteUser}
            </Button>
          ) : null}
        </div>
      </header>

      {usage && (
        <div className={bannerClass}>
          <div className={styles.seatsBannerHead}>
            <span className={styles.seatsBannerTitle}>{seatsTitle(usage)}</span>
            <Typography.Text type="secondary">{seatsDetail(usage)}</Typography.Text>
          </div>
          {usage.usersLimit > 0 && (
            <Progress
              percent={seatPercent}
              showInfo={false}
              status={tone === "full" ? "exception" : tone === "warn" ? "active" : "normal"}
              strokeColor={tone === "warn" ? "var(--color-warning)" : undefined}
            />
          )}
          {usage.usersLimit > 0 && (
            <Typography.Text className={styles.seatsBannerMeta}>
              {t.settings.seatsOwnerIncluded}
              {tone === "full" && (
                <Link to="/settings/subscription" className={styles.seatsBannerUpgrade}>
                  {t.settings.seatsUpgrade}
                </Link>
              )}
            </Typography.Text>
          )}
        </div>
      )}

      <Card variant="borderless" className={styles.settingsCard}>
        {loading ? (
          <Spin size="large" style={{ display: "block", margin: "48px auto" }} />
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={users}
              rowKey="id"
              pagination={false}
              scroll={{ x: "max-content" }}
              className={styles.usersTable}
              columns={[
                {
                  title: t.common.name,
                  dataIndex: "fullName",
                  render: (name: string) => (
                    <span className={styles.userCell}>
                      <User size={16} className={styles.userCellIcon} />
                      {name}
                    </span>
                  ),
                },
                { title: t.auth.email, dataIndex: "email" },
                {
                  title: t.settings.role,
                  dataIndex: "role",
                  render: (role: string, row) => roleToLabel(role, row.roleName),
                },
                {
                  title: t.settings.assignStoresColumn,
                  dataIndex: "storeNames",
                  render: (names: string[] | undefined, row) =>
                    isOwnerRole(row.role) || !names?.length
                      ? t.settings.assignStoresAll
                      : names.join(", "),
                },
                {
                  title: t.common.actions,
                  width: 280,
                  render: (_, row) => {
                    if (isOwnerRole(row.role)) return "—";
                    const showAssign = canAssignStores;
                    const showRemove = canRemove;
                    if (!showAssign && !showRemove) return "—";
                    return (
                      <Space size={4} wrap>
                        {showAssign ? (
                          <Button
                            type="text"
                            size="small"
                            icon={<Store size={14} />}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              openAssignModal(row);
                            }}
                          >
                            {t.settings.assignStores}
                          </Button>
                        ) : null}
                        {showRemove ? (
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<UserMinus size={14} />}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              confirmRemove(row);
                            }}
                          >
                            {t.settings.removeMember}
                          </Button>
                        ) : null}
                      </Space>
                    );
                  },
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Modal
        title={t.settings.assignStoresTitle}
        open={assignModalOpen}
        onOk={onAssignStores}
        onCancel={() => {
          setAssignModalOpen(false);
          setAssignUser(null);
          assignForm.resetFields();
        }}
        okText={t.common.save}
        destroyOnClose
      >
        {assignUser && (
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            {assignUser.fullName} — {assignUser.email}
          </Typography.Text>
        )}
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          {t.settings.assignStoresDesc}
        </Typography.Text>
        {assignLoading ? (
          <Spin />
        ) : stores.length === 0 ? (
          <Typography.Text type="secondary">
            {t.stores.noStores} — <Link to="/settings/stores">{t.stores.addStore}</Link>
          </Typography.Text>
        ) : (
          <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="storeIds" label={t.settings.assignStoresColumn}>
              <Select
                mode="multiple"
                placeholder={t.settings.assignStoresPlaceholder}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                allowClear
                showSearch
                filterOption={(input, opt) =>
                  (opt?.label ?? "").toString().toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title={t.settings.inviteUser}
        open={inviteOpen}
        onOk={onInvite}
        onCancel={() => {
          setInviteOpen(false);
          form.resetFields();
        }}
        okText={t.settings.sendInvitation}
        confirmLoading={inviting}
        okButtonProps={{ disabled: usersAtLimit }}
      >
        {usage && (
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            {seatsDetail(usage)}
            {usage.usersLimit > 0 ? ` — ${t.settings.seatsOwnerIncluded}` : ""}
          </Typography.Text>
        )}
        <Form
          form={form}
          layout="vertical"
          className={styles.settingsFormItem}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="email"
            label={t.auth.email}
            rules={[
              { required: true, message: t.validation.requiredField },
              { type: "email", message: t.validation.email },
            ]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item
            name="role"
            label={t.settings.role}
            rules={[{ required: true, message: t.validation.requiredField }]}
            initialValue={ROLES.CAISSIER}
          >
            <Select options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
