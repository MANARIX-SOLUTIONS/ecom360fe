import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Alert } from "antd";
import { Lock, ArrowLeft } from "lucide-react";
import { t } from "@/i18n";
import { resetPassword } from "@/api";
import styles from "./ForgotPassword.module.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onFinish = async (values: { newPassword: string }) => {
    if (!token) {
      setError(t.auth.resetPasswordInvalidLinkError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(token, values.newPassword);
      setSuccess(true);
      message.success(t.auth.resetPasswordSuccessToast);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.resetPasswordGenericError);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.wrapper}>
        <Card className={styles.card} variant="borderless">
          <Alert
            message={t.auth.resetPasswordInvalidLinkAlertTitle}
            description={t.auth.resetPasswordInvalidLinkAlertDesc}
            type="warning"
            showIcon
          />
          <Link to="/forgot-password">
            <Button type="primary" block size="large" style={{ marginTop: 24, height: 48 }}>
              {t.auth.resetPasswordRequestNewLink}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.wrapper}>
        <Card className={styles.card} variant="borderless">
          <div className={styles.successBlock}>
            <Typography.Title level={4} style={{ color: "var(--color-primary)", marginBottom: 8 }}>
              {t.auth.resetPasswordSuccessTitle}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t.auth.resetPasswordSuccessSubtitle}
            </Typography.Text>
          </div>
          <Button
            type="primary"
            block
            size="large"
            style={{ marginTop: 24, height: 48 }}
            onClick={() => navigate("/login")}
          >
            {t.auth.backToLogin}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Card className={styles.card} variant="borderless">
        <div className={styles.logoBlock}>
          <Typography.Title level={4} style={{ color: "var(--color-primary)", marginBottom: 8 }}>
            {t.auth.resetPasswordPageTitle}
          </Typography.Title>
          <Typography.Text type="secondary">{t.auth.resetPasswordPageSubtitle}</Typography.Text>
        </div>
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginTop: 16, marginBottom: 16 }}
          />
        )}
        <Form
          name="reset"
          layout="vertical"
          size="large"
          onFinish={onFinish}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="newPassword"
            label={t.auth.resetPasswordNewPasswordLabel}
            rules={[
              { required: true, message: t.validation.requiredField },
              { min: 8, message: t.auth.resetPasswordMinCharsRule },
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
            label={t.auth.resetPasswordConfirmLabel}
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
          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 48 }}>
              {t.auth.resetPasswordSubmit}
            </Button>
          </Form.Item>
          <Link to="/login">
            <Button type="link" block icon={<ArrowLeft size={16} />} style={{ padding: 8 }}>
              {t.auth.backToLogin}
            </Button>
          </Link>
        </Form>
      </Card>
    </div>
  );
}
