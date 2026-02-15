import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Alert,
} from "antd";
import { Mail, Lock, User, Building2, ShoppingBag } from "lucide-react";
import { ApiError, register } from "@/api";
import { t } from "@/i18n";
import styles from "./Login.module.css";

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onFinish = async (values: {
    fullName: string;
    email: string;
    password: string;
    businessName: string;
    phone?: string;
  }) => {
    setError(null);
    setLoading(true);
    try {
      await register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        businessName: values.businessName,
        phone: values.phone || undefined,
      });
      message.success("Compte créé ! Bienvenue sur 360 PME Commerce.");
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Erreur lors de l'inscription");
      } else {
        setError("Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.formPanel}>
        <Card className={styles.card} bordered={false}>
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
              Créer un compte
            </Typography.Title>
            <Typography.Text type="secondary">
              Essai gratuit 30 jours — Aucune carte requise
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
            name="register"
            layout="vertical"
            size="large"
            onFinish={onFinish}
            autoComplete="off"
            className={styles.formBlock}
          >
            <Form.Item
              name="fullName"
              rules={[
                { required: true, message: t.validation.nameRequired },
                { min: 2, message: "Minimum 2 caractères" },
              ]}
            >
              <Input
                prefix={<User size={18} />}
                placeholder="Votre nom complet"
                autoComplete="name"
              />
            </Form.Item>
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
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item
              name="businessName"
              rules={[
                { required: true, message: "Nom de l'entreprise requis" },
                { min: 2, message: "Minimum 2 caractères" },
              ]}
            >
              <Input
                prefix={<Building2 size={18} />}
                placeholder="Nom de votre commerce / entreprise"
                autoComplete="organization"
              />
            </Form.Item>
            <Form.Item name="phone">
              <Input placeholder="Téléphone (optionnel)" />
            </Form.Item>

            <Form.Item className={styles.submitBlock}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className={styles.submitBtn}
              >
                Créer mon compte
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.footer}>
            <Typography.Text type="secondary">
              Déjà un compte ?{" "}
              <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 500 }}>
                Se connecter
              </Link>
            </Typography.Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
