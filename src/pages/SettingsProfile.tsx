import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Spin, Descriptions } from "antd";
import { ArrowLeft } from "lucide-react";
import { t } from "@/i18n";
import { getBusinessProfile, updateBusinessProfile } from "@/api";
import { useAuthRole } from "@/hooks/useAuthRole";
import { ROLES } from "@/constants/roles";
import styles from "./Settings.module.css";

export default function SettingsProfile() {
  const navigate = useNavigate();
  const { role, isSuperAdmin } = useAuthRole();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    phone?: string;
    address?: string;
  } | null>(null);

  const canEdit = role === ROLES.PROPRIETAIRE || isSuperAdmin;

  useEffect(() => {
    getBusinessProfile()
      .then((data) => {
        setProfile({
          name: data.name,
          email: data.email,
          phone: data.phone ?? undefined,
          address: data.address ?? undefined,
        });
        form.setFieldsValue({
          name: data.name,
          address: data.address ?? "",
          phone: data.phone ?? "",
          email: data.email,
        });
      })
      .catch(() => message.error("Impossible de charger le profil"))
      .finally(() => setLoading(false));
  }, [form]);

  const onFinish = async (values: {
    name: string;
    address?: string;
    phone?: string;
    email: string;
  }) => {
    setSaving(true);
    try {
      await updateBusinessProfile({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
      });
      message.success("Profil entreprise mis à jour");
      setProfile({
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`${styles.settingsPage} pageWrapper`}>
        <Spin size="large" style={{ display: "block", margin: "48px auto" }} />
      </div>
    );
  }

  return (
    <div className={`${styles.settingsPage} pageWrapper`}>
      <button type="button" className={styles.settingsBack} onClick={() => navigate("/settings")}>
        <ArrowLeft size={18} />
        {t.common.back}
      </button>

      <header className={styles.settingsPageHeader}>
        <Typography.Title level={4} className={styles.settingsPageTitle}>
          {t.settings.companyProfile}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
          {canEdit
            ? t.settings.companyProfileHint
            : "Seul le propriétaire peut modifier les informations de l'entreprise."}
        </Typography.Text>
      </header>

      <Card variant="borderless" className={styles.settingsCard}>
        {canEdit ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            className={styles.settingsFormItem}
          >
            <Form.Item
              name="name"
              label={t.common.name}
              rules={[{ required: true, message: t.validation.nameRequired }]}
            >
              <Input placeholder="Nom de l'entreprise" />
            </Form.Item>
            <Form.Item name="address" label={t.settings.addressLabel}>
              <Input placeholder={t.stores.address} />
            </Form.Item>
            <Form.Item
              name="phone"
              label={t.common.phone}
              rules={[{ pattern: /^[\d\s+()-]{0,20}$/, message: t.validation.phoneInvalid }]}
            >
              <Input placeholder="33 123 45 67" />
            </Form.Item>
            <Form.Item
              name="email"
              label={t.auth.email}
              rules={[
                { required: true, message: t.validation.requiredField },
                { type: "email", message: t.validation.email },
              ]}
            >
              <Input type="email" placeholder={t.validation.emailPlaceholder} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                className={styles.settingsSubmit}
                block
                loading={saving}
              >
                {t.common.save}
              </Button>
            </Form.Item>
          </Form>
        ) : (
          profile && (
            <Descriptions column={1} size="middle">
              <Descriptions.Item label={t.common.name}>{profile.name}</Descriptions.Item>
              <Descriptions.Item label={t.auth.email}>{profile.email}</Descriptions.Item>
              <Descriptions.Item label={t.common.phone}>{profile.phone || "—"}</Descriptions.Item>
              <Descriptions.Item label={t.settings.addressLabel}>
                {profile.address || "—"}
              </Descriptions.Item>
            </Descriptions>
          )
        )}
      </Card>
    </div>
  );
}
