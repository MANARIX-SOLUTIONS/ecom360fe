import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Table, Button, Typography, Modal, Form, Input, Select, message, Spin } from "antd";
import { ArrowLeft, Plus, User } from "lucide-react";
import { t } from "@/i18n";
import { ROLES } from "@/constants/roles";
import { Link } from "react-router-dom";
import { listBusinessUsers, inviteBusinessUser, getSubscriptionUsage } from "@/api";
import type { BusinessUser } from "@/api";
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form] = Form.useForm();
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [usersAtLimit, setUsersAtLimit] = useState(false);

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
          ) : (
            <Button type="primary" icon={<Plus size={18} />} onClick={() => setInviteOpen(true)}>
              {t.settings.inviteUser}
            </Button>
          )}
        </div>
      </header>

      <Card bordered={false} className={styles.settingsCard}>
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
                  title: "",
                  width: 100,
                  align: "right",
                  render: (_, r) =>
                    r.role?.toLowerCase() !== "proprietaire" ? (
                      <Button type="text" size="small">
                        {t.common.edit}
                      </Button>
                    ) : null,
                },
              ]}
            />
          </div>
        )}
      </Card>

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
