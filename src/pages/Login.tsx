import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Select,
  Alert,
  Checkbox,
} from "antd";
import { Mail, Lock, ShoppingBag, BarChart3, Users, Smartphone, Shield, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/api";
import { useAuthRole } from "@/hooks/useAuthRole";
import { ROLES, type Role } from "@/constants/roles";
import { t } from "@/i18n";
import styles from "./Login.module.css";

const isDev = import.meta.env.DEV;

const ROLE_OPTIONS = [
  { value: ROLES.SUPER_ADMIN, label: t.roles.superAdmin },
  { value: ROLES.PROPRIETAIRE, label: t.roles.owner },
  { value: ROLES.GESTIONNAIRE, label: t.roles.manager },
  { value: ROLES.CAISSIER, label: t.roles.cashier },
];

const FEATURES = [
  { icon: Zap, text: "Point de vente rapide et intuitif" },
  { icon: BarChart3, text: "Rapports et analyses en temps réel" },
  { icon: Users, text: "Gestion clients et fournisseurs" },
  { icon: Smartphone, text: "Fonctionne sur mobile et desktop" },
];

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const { loginWithApi } = useAuth();
  const { setRole } = useAuthRole();

  const onFinish = async (values: {
    email: string;
    password: string;
    role?: string;
    remember?: boolean;
  }) => {
    setError(null);
    setLoading(true);
    try {
      try {
        await loginWithApi({ email: values.email, password: values.password });
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || t.auth.invalidCredentials);
          return;
        }
        setError(t.auth.invalidCredentials);
        return;
      }
      if (values.role && Object.values(ROLES).includes(values.role as Role)) {
        setRole(values.role as Role);
      }
      message.success(t.auth.loginSuccess);
      const role = localStorage.getItem("ecom360_role") || "proprietaire";
      const isSuperAdmin = role === ROLES.SUPER_ADMIN;
      const validFrom =
        from &&
        (isSuperAdmin ? from.startsWith("/backoffice") : !from.startsWith("/backoffice"));
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
            <ShoppingBag size={28} strokeWidth={1.5} />
          </div>
          <Typography.Title level={2} className={styles.brandTitle}>
            360 PME Commerce
          </Typography.Title>
          <Typography.Text className={styles.brandSubtitle}>
            La solution tout-en-un pour gérer votre commerce. Ventes, stocks,
            clients et rapports — simplement.
          </Typography.Text>

          <div className={styles.featureList}>
            {FEATURES.map(({ icon: Icon, text }) => (
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
              +200 commerçants nous font confiance
            </Typography.Text>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.formPanel}>
        <Card className={styles.card} bordered={false}>
          {/* Mobile-only branding */}
          <div className={styles.mobileBrand}>
            <div className={styles.mobileBrandIcon}>
              <ShoppingBag size={22} />
            </div>
            <span className={styles.mobileBrandName}>360 PME</span>
          </div>

          <div className={styles.logoBlock}>
            <Typography.Title
              level={3}
              style={{ color: "var(--color-primary)", marginBottom: 8 }}
            >
              Connexion
            </Typography.Title>
            <Typography.Text type="secondary">
              Accédez à votre espace de gestion
            </Typography.Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              className={styles.errorAlert}
            />
          )}

          <Form
            name="login"
            layout="vertical"
            size="large"
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

            {isDev && (
              <Form.Item
                name="role"
                label={
                  <span>
                    {t.auth.roleLabel}{" "}
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 11, fontWeight: 400 }}
                    >
                      (dev only)
                    </Typography.Text>
                  </span>
                }
                initialValue={ROLES.PROPRIETAIRE}
              >
                <Select
                  placeholder={t.auth.selectRole}
                  options={ROLE_OPTIONS}
                  allowClear={false}
                />
              </Form.Item>
            )}

            <div className={styles.rememberRow}>
              <Form.Item
                name="remember"
                valuePropName="checked"
                initialValue={true}
                style={{ marginBottom: 0 }}
              >
                <Checkbox>Se souvenir de moi</Checkbox>
              </Form.Item>
              <Link to="/forgot-password">
                <Button type="link" style={{ padding: 0, height: "auto" }}>
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
              <Shield size={14} />
              <span>Connexion sécurisée et chiffrée</span>
            </div>
            <div className={styles.trialNote}>
              Pas encore de compte ?{' '}
              <Link to="/register" className={styles.trialLink}>
                Essai gratuit 30 jours
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
