import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Table, Button, Typography, Modal, Form, Input, Select, message, Spin } from "antd";
import { ArrowLeft, Plus, User, Store } from "lucide-react";
import { t } from "@/i18n";
import { ROLES } from "@/constants/roles";
import { Link } from "react-router-dom";
import {
  listBusinessUsers,
  inviteBusinessUser,
  getSubscriptionUsage,
  getAssignedStores,
  assignStores,
  listStores,
} from "@/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { BusinessUser } from "@/api";
import type { StoreResponse } from "@/api/stores";
import styles from "./Settings.module.css";

const roleOptions = [
  { value: ROLES.CAISSIER, label: t.roles.cashier },
  { value: ROLES.GESTIONNAIRE, label: t.roles.manager },
  { value: ROLES.PROPRIETAIRE, label: t.roles.owner },
];

function roleToLabel(role: string): string {
  const r = role?.toLowerCase();
  if (r === "proprietaire") return t.roles.owner;
  if (r === "gestionnaire") return t.roles.manager;
  return t.roles.cashier;
}

export default function SettingsUsers() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form] = Form.useForm();
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [usersAtLimit, setUsersAtLimit] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<BusinessUser | null>(null);
  const [assignForm] = Form.useForm();
  const [assignLoading, setAssignLoading] = useState(false);
  const [stores, setStores] = useState<StoreResponse[]>([]);

  useEffect(() => {
    listBusinessUsers()
      .then(setUsers)
      .catch(() => message.error("Impossible de charger les utilisateurs"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) => setUsersAtLimit(u.usersLimit > 0 && u.usersCount >= u.usersLimit))
      .catch(() => setUsersAtLimit(false));
  }, [users.length]);

  const openAssignModal = async (user: BusinessUser) => {
    setAssignUser(user);
    setAssignModalOpen(true);
    setAssignLoading(true);
    try {
      const [storesList, assigned] = await Promise.all([listStores(), getAssignedStores(user.id)]);
      setStores(storesList);
      assignForm.setFieldsValue({ storeIds: assigned.map((s) => s.id) });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Impossible de charger les boutiques");
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
      message.success("Boutiques mises à jour");
      setAssignModalOpen(false);
      setAssignUser(null);
      assignForm.resetFields();
    } catch (e) {
      if (e instanceof Error && e.message?.includes("required")) return;
      message.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
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
      message.success("Invitation envoyée");
      listBusinessUsers().then(setUsers);
    } catch (e) {
      if (e instanceof Error && e.message?.includes("required")) return;
      message.error(e instanceof Error ? e.message : "Erreur lors de l'invitation");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className={`${styles.settingsPage} pageWrapper`}>
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
          {usersAtLimit ? (
            <Typography.Text type="secondary" style={{ marginRight: 8 }}>
              Limite atteinte. <Link to="/settings/subscription">Passer à un plan supérieur</Link>
            </Typography.Text>
          ) : can("BUSINESS_USERS_CREATE") ? (
            <Button type="primary" icon={<Plus size={18} />} onClick={() => setInviteOpen(true)}>
              {t.settings.inviteUser}
            </Button>
          ) : null}
        </div>
      </header>

      <Card variant="borderless" className={styles.settingsCard}>
        {loading ? (
          <Spin size="large" style={{ display: "block", margin: "48px auto" }} />
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={users}
              rowKey="id"
              pagination={false}
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
                  render: (role: string) => roleToLabel(role),
                },
                {
                  title: t.stores.title,
                  width: 160,
                  render: (_, r) =>
                    r.role?.toLowerCase() !== "proprietaire" && can("BUSINESS_USERS_UPDATE") ? (
                      <Button
                        type="text"
                        size="small"
                        icon={<Store size={14} style={{ marginRight: 4 }} />}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openAssignModal(r);
                        }}
                      >
                        {t.settings.assignStores}
                      </Button>
                    ) : (
                      "—"
                    ),
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
            <Form.Item name="storeIds" label={t.stores.title}>
              <Select
                mode="multiple"
                placeholder={t.stores.selectStore}
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
      >
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
