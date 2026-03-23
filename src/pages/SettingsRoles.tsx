import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Table, Button, Typography, Modal, Form, Input, Checkbox, message, Spin } from "antd";
import { ArrowLeft, Shield } from "lucide-react";
import { t } from "@/i18n";
import {
  listRoles,
  listPermissionCatalog,
  createRole,
  assignRolePermissions,
  type BusinessRoleDto,
} from "@/api";
import { usePermissions } from "@/hooks/usePermissions";
import styles from "./Settings.module.css";

export default function SettingsRoles() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [roles, setRoles] = useState<BusinessRoleDto[]>([]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRoleDto | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([listRoles(), listPermissionCatalog()]);
      setRoles(r);
      setCatalog(c);
    } catch {
      message.error("Impossible de charger les rôles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (role: BusinessRoleDto) => {
    setEditing(role);
    setSelected([...role.permissions]);
    setEditOpen(true);
  };

  const onSavePermissions = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const updated = await assignRolePermissions(editing.id, selected);
      message.success("Permissions enregistrées");
      setRoles((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditOpen(false);
      setEditing(null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur à l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const onCreateRole = async () => {
    try {
      await createForm.validateFields();
      setCreating(true);
      const name = createForm.getFieldValue("name") as string;
      const created = await createRole(name.trim());
      message.success("Rôle créé");
      setCreateOpen(false);
      createForm.resetFields();
      setRoles((prev) => [...prev, created]);
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const canEdit = can("BUSINESS_USERS_UPDATE");

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
              {t.settings.rolesPermissions}
            </Typography.Title>
            <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
              {t.settings.rolesPermissionsDesc}
            </Typography.Text>
          </div>
          {canEdit ? (
            <Button type="primary" icon={<Shield size={18} />} onClick={() => setCreateOpen(true)}>
              {t.settings.createCustomRole}
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
              dataSource={roles}
              rowKey="id"
              pagination={false}
              className={styles.usersTable}
              columns={[
                { title: t.settings.role, dataIndex: "name" },
                { title: "Code", dataIndex: "code", width: 140 },
                {
                  title: "",
                  width: 160,
                  render: (_, r) =>
                    canEdit ? (
                      <Button type="link" size="small" onClick={() => openEdit(r)}>
                        Permissions
                      </Button>
                    ) : null,
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Modal
        title={editing ? `${editing.name} (${editing.code})` : ""}
        open={editOpen}
        onOk={onSavePermissions}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        okText={t.settings.saveRolePermissions}
        confirmLoading={saving}
        width={720}
        destroyOnClose
      >
        {catalog.length > 0 ? (
          <Checkbox.Group
            style={{ width: "100%" }}
            value={selected}
            onChange={(v) => setSelected(v as string[])}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 8,
                maxHeight: 420,
                overflow: "auto",
              }}
            >
              {catalog.map((code) => (
                <Checkbox key={code} value={code}>
                  {code}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        ) : (
          <Typography.Text type="secondary">Aucune permission disponible.</Typography.Text>
        )}
      </Modal>

      <Modal
        title={t.settings.createCustomRole}
        open={createOpen}
        onOk={onCreateRole}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        okText={t.common.save}
        confirmLoading={creating}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.settings.customRoleName}
            rules={[{ required: true, message: t.validation.requiredField }]}
          >
            <Input placeholder="Ex. Chef de rayon" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
