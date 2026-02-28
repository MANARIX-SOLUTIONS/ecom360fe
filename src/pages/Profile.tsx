import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, Tag, Spin, message } from "antd";
import { ArrowLeft, User, Mail, Phone, Shield } from "lucide-react";
import { useAuthRole } from "@/hooks/useAuthRole";
import { getUserProfile, updateUserProfile } from "@/api";
import { setAuth } from "@/api/client";
import { PROFILE_UPDATED_EVENT } from "@/hooks/useUserProfile";
import { t } from "@/i18n";
import styles from "./Profile.module.css";

export default function Profile() {
  const navigate = useNavigate();
  const { role } = useAuthRole();
  const [profile, setProfile] = useState<{
    fullName: string;
    email: string;
    phone?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    getUserProfile()
      .then((data) => setProfile({ fullName: data.fullName, email: data.email, phone: data.phone }))
      .catch(() => message.error("Impossible de charger le profil"))
      .finally(() => setLoading(false));
  }, []);

  const roleLabel =
    role === "super_admin"
      ? t.roles.superAdmin
      : role === "proprietaire"
        ? t.roles.owner
        : role === "gestionnaire"
          ? t.roles.manager
          : t.roles.cashier;

  const roleColor =
    role === "super_admin"
      ? "red"
      : role === "proprietaire"
        ? "blue"
        : role === "gestionnaire"
          ? "green"
          : "default";

  const displayName = profile?.fullName?.trim() || "Utilisateur";
  const initials =
    displayName
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const startEdit = () => {
    if (profile) {
      form.setFieldsValue({
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone ?? "",
      });
      setEditing(true);
    }
  };

  const onFinish = async (values: { name: string; email: string; phone?: string }) => {
    setSaving(true);
    try {
      const updated = await updateUserProfile({
        fullName: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
      });
      setProfile({ fullName: updated.fullName, email: updated.email, phone: updated.phone });
      const access = localStorage.getItem("ecom360_access_token");
      const refresh = localStorage.getItem("ecom360_refresh_token");
      if (access && refresh) {
        setAuth(
          { accessToken: access, refreshToken: refresh },
          {
            fullName: updated.fullName,
            email: updated.email,
            businessId: localStorage.getItem("ecom360_business_id") || "",
            role: role || "",
            planSlug: localStorage.getItem("ecom360_plan_slug") || undefined,
          }
        );
      }
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      setEditing(false);
      message.success("Profil mis à jour");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    form.resetFields();
    setEditing(false);
  };

  if (loading || !profile) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <Spin size="large" style={{ display: "block", margin: "48px auto" }} />
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <Button
        type="text"
        icon={<ArrowLeft size={18} />}
        onClick={() => navigate(-1)}
        className={styles.back}
      >
        {t.common.back}
      </Button>

      <header className={styles.header}>
        <div className={styles.avatarWrap}>
          <span className={styles.avatar} aria-hidden>
            {initials}
          </span>
        </div>
        <Typography.Title level={4} className={styles.title}>
          {displayName}
        </Typography.Title>
        <Tag color={roleColor} className={styles.roleBadge} icon={<Shield size={12} />}>
          {roleLabel}
        </Tag>
        {profile.email ? (
          <Typography.Text type="secondary" className={styles.subtitle}>
            {profile.email}
          </Typography.Text>
        ) : null}
      </header>

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {!editing ? (
          <>
            <div className={styles.detailRow}>
              <User size={18} className={styles.detailIcon} />
              <div>
                <Typography.Text type="secondary" className={styles.detailLabel}>
                  {t.common.name}
                </Typography.Text>
                <div className={styles.detailValue}>{profile.fullName || "—"}</div>
              </div>
            </div>
            <div className={styles.detailRow}>
              <Mail size={18} className={styles.detailIcon} />
              <div>
                <Typography.Text type="secondary" className={styles.detailLabel}>
                  {t.auth.email}
                </Typography.Text>
                <div className={styles.detailValue}>{profile.email || "—"}</div>
              </div>
            </div>
            <div className={styles.detailRow}>
              <Phone size={18} className={styles.detailIcon} />
              <div>
                <Typography.Text type="secondary" className={styles.detailLabel}>
                  {t.common.phone}
                </Typography.Text>
                <div className={styles.detailValue}>{profile.phone || "—"}</div>
              </div>
            </div>
            <Button
              type="primary"
              block
              size="large"
              onClick={startEdit}
              className={styles.editBtn}
            >
              {t.common.edit}
            </Button>
          </>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            initialValues={{
              name: profile.fullName,
              email: profile.email,
              phone: profile.phone ?? "",
            }}
          >
            <Form.Item
              name="name"
              label={t.common.name}
              rules={[{ required: true, message: t.validation.nameRequired }]}
            >
              <Input placeholder={t.common.name} />
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
            <Form.Item
              name="phone"
              label={t.common.phone}
              rules={[
                {
                  pattern: /^[\d\s+()-]{0,20}$/,
                  message: t.validation.phoneInvalid,
                },
              ]}
            >
              <Input placeholder="33 123 45 67" />
            </Form.Item>
            <div className={styles.formActions}>
              <Button onClick={cancelEdit}>{t.common.cancel}</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                {t.common.save}
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
