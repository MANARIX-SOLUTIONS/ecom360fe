import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { t } from "@/i18n";
import styles from "./ForgotPassword.module.css";
import { forgotPassword } from "@/api/auth";

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      await forgotPassword(values.email);
      setSent(true);
      message.success(t.auth.forgotPasswordSent);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.wrapper}>
        <Card className={styles.card} bordered={false}>
          <div className={styles.successBlock}>
            <CheckCircle size={48} className={styles.successIcon} />
            <Typography.Title level={4} style={{ color: "var(--color-primary)", marginBottom: 8 }}>
              {t.auth.forgotPasswordTitle}
            </Typography.Title>
            <Typography.Text type="secondary">{t.auth.forgotPasswordSent}</Typography.Text>
          </div>
          <Link to="/login">
            <Button type="primary" block size="large" style={{ marginTop: 24, height: 48 }}>
              {t.auth.backToLogin}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Card className={styles.card} bordered={false}>
        <div className={styles.logoBlock}>
          <Typography.Title level={4} style={{ color: "var(--color-primary)", marginBottom: 8 }}>
            {t.auth.forgotPasswordTitle}
          </Typography.Title>
          <Typography.Text type="secondary">{t.auth.forgotPasswordHint}</Typography.Text>
        </div>
        <Form
          name="forgot"
          layout="vertical"
          size="large"
          onFinish={onFinish}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: t.validation.requiredField },
              { type: "email", message: t.validation.email },
            ]}
          >
            <Input
              prefix={<Mail size={18} />}
              placeholder={t.validation.emailPlaceholder}
              type="email"
              autoComplete="email"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 48 }}>
              {t.auth.sendResetLink}
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
