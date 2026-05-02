import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Alert, Checkbox } from "antd";
import { Mail, Lock, BarChart3, Users, Smartphone, Shield, Zap } from "lucide-react";
import { APP_LOGO_MARK } from "@/constants/branding";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/api";
import { ROLES } from "@/constants/roles";
import { prefetchPermissionsBundle } from "@/utils/permissionsCache";
import { t } from "@/i18n";
import styles from "./Login.module.css";

const LOGIN_FEATURES = [
  { icon: Zap, text: t.loginBrand.feature1 },
  { icon: BarChart3, text: t.loginBrand.feature2 },
  { icon: Users, text: t.loginBrand.feature3 },
  { icon: Smartphone, text: t.loginBrand.feature4 },
];

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as { from?: { pathname: string; search?: string } })?.from;
  const from = fromLocation ? `${fromLocation.pathname}${fromLocation.search ?? ""}` : undefined;
  const { loginWithApi } = useAuth();

  const onFinish = async (values: { email: string; password: string; remember?: boolean }) => {
    setError(null);
    setLoading(true);
    try {
      try {
        await loginWithApi({ email: values.email, password: values.password });
        await prefetchPermissionsBundle();
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || t.auth.invalidCredentials);
          return;
        }
        setError(t.auth.invalidCredentials);
        return;
      }
      message.success(t.auth.loginSuccess);
      const role = localStorage.getItem("ecom360_role") || "proprietaire";
      const isSuperAdmin = role === ROLES.SUPER_ADMIN;
      const validFrom =
        from && (isSuperAdmin ? from.startsWith("/backoffice") : !from.startsWith("/backoffice"));
      const target = validFrom ? from : isSuperAdmin ? "/backoffice" : "/dashboard";
      navigate(target, { replace: true });
    } catch {
      setError(t.auth.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Left branding panel (desktop only) */}
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.brandLogo}>
            <img src={APP_LOGO_MARK} alt="" className={styles.brandLogoImg} />
          </div>
          <Typography.Title level={2} className={styles.brandTitle}>
            {t.loginBrand.title}
          </Typography.Title>
          <Typography.Text className={styles.brandSubtitle}>
            {t.loginBrand.subtitle}
          </Typography.Text>

          <div className={styles.featureList}>
            {LOGIN_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className={styles.featureItem}>
                <span className={styles.featureIcon}>
                  <Icon size={18} />
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className={styles.socialProof}>
            <div className={styles.socialAvatars}>
              {["AD", "FB", "MS", "IN"].map((initials) => (
                <span key={initials} className={styles.socialAvatar}>
                  {initials}
                </span>
              ))}
            </div>
            <Typography.Text className={styles.socialText}>
              {t.loginBrand.socialProof}
            </Typography.Text>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={`${styles.formPanel} ${styles.loginFormPanel}`}>
        <Card className={`${styles.card} ${styles.loginCard}`} variant="borderless">
          {/* Mobile-only branding */}
          <div className={styles.mobileBrand}>
            <div className={styles.mobileBrandIcon}>
              <img src={APP_LOGO_MARK} alt="" className={styles.mobileBrandImg} />
            </div>
            <span className={styles.mobileBrandName}>360 PME</span>
          </div>

          <div className={styles.logoBlock}>
            <Typography.Title level={4} style={{ color: "var(--color-primary)", marginBottom: 6 }}>
              {t.auth.loginTitle}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {t.auth.loginSubtitle}
            </Typography.Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              className={`${styles.errorAlert} ${styles.compactErrorAlert}`}
            />
          )}

          <Form
            name="login"
            layout="vertical"
            size="middle"
            onFinish={onFinish}
            autoComplete="off"
            className={styles.formBlock}
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
            <Form.Item
              name="password"
              rules={[
                { required: true, message: t.auth.enterPassword },
                { min: 6, message: t.validation.passwordMin },
              ]}
            >
              <Input.Password
                prefix={<Lock size={18} />}
                placeholder={t.auth.password}
                autoComplete="current-password"
              />
            </Form.Item>

            <div className={styles.rememberRow}>
              <Form.Item
                name="remember"
                valuePropName="checked"
                initialValue={true}
                style={{ marginBottom: 0 }}
              >
                <Checkbox>{t.auth.rememberMe}</Checkbox>
              </Form.Item>
              <Link to="/forgot-password">
                <Button type="link" className={styles.forgotLink}>
                  {t.auth.forgotPassword}
                </Button>
              </Link>
            </div>

            <Form.Item className={styles.submitBlock}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className={styles.submitBtn}
              >
                {t.auth.login}
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.footer}>
            <div className={styles.securityNote}>
              <Shield size={14} aria-hidden />
              <span>{t.auth.secureConnection}</span>
            </div>
            <div className={styles.trialNote}>
              {t.auth.trialPrompt}{" "}
              <Link to="/demo-request" className={styles.trialLink}>
                {t.demo.pageTitle}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
