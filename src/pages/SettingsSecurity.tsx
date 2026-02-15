import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { ArrowLeft, Lock } from "lucide-react";
import { t } from "@/i18n";
import { changePassword } from "@/api";
import styles from "./Settings.module.css";

export default function SettingsSecurity() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: { currentPassword: string; newPassword: string }) => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      message.success("Mot de passe mis à jour");
      form.resetFields();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    }
  };

  return (
    <div className={`${styles.settingsPage} pageWrapper`}>
      <button type="button" className={styles.settingsBack} onClick={() => navigate("/settings")}>
        <ArrowLeft size={18} />
        {t.common.back}
      </button>

      <header className={styles.settingsPageHeader}>
        <Typography.Title level={4} className={styles.settingsPageTitle}>
          {t.settings.security}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
          {t.settings.securityHint}
        </Typography.Text>
      </header>

      <Card bordered={false} className={styles.settingsCard}>
        <Typography.Text
          type="secondary"
          className={styles.settingsPageSubtitle}
          style={{ marginBottom: 20, display: "block" }}
        >
          {t.settings.changePassword}
        </Typography.Text>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
          className={styles.settingsFormItem}
        >
          <Form.Item
            name="currentPassword"
            label={t.settings.currentPassword}
            rules={[{ required: true, message: t.validation.passwordRequired }]}
          >
            <Input.Password
              prefix={<Lock size={18} />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t.settings.newPassword}
            rules={[
              { required: true, message: t.validation.requiredField },
              { min: 8, message: "Minimum 8 caractères" },
            ]}
          >
            <Input.Password
              prefix={<Lock size={18} />}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t.settings.confirmPassword}
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: t.validation.requiredField },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                  return Promise.reject(new Error(t.settings.passwordMismatch));
                },
              }),
            ]}
          >
            <Input.Password prefix={<Lock size={18} />} placeholder="••••••••" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" className={styles.settingsSubmit} block>
              {t.settings.updatePassword}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
