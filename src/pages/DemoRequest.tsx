import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, Form, Input, Button, Typography, Alert, Result, Collapse, Tag } from "antd";
import {
  Mail,
  User,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  CalendarDays,
  Clock,
  MessageCircle,
} from "lucide-react";
import { APP_LOGO_MARK } from "@/constants/branding";
import { ApiError, submitDemoRequest } from "@/api";
import { t } from "@/i18n";
import styles from "./Login.module.css";
import demoStyles from "./DemoRequest.module.css";

const DEMO_BRAND_FEATURES = [
  { icon: CalendarDays, text: t.demo.brandFeature1 },
  { icon: Clock, text: t.demo.brandFeature2 },
  { icon: Mail, text: t.demo.brandFeature3 },
  { icon: MessageCircle, text: t.demo.brandFeature4 },
];

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

const BILLING_LABELS: Record<string, string> = {
  monthly: "Mensuel",
  yearly: "Annuel",
};

function getPreferredSubscription(search: string) {
  const params = new URLSearchParams(search);
  const plan = params.get("plan")?.toLowerCase() ?? "";
  const billing: "monthly" | "yearly" = params.get("billing") === "yearly" ? "yearly" : "monthly";
  if (!PLAN_LABELS[plan]) return null;
  return { plan, billing };
}

function DemoBrandPanel() {
  return (
    <div className={styles.brandPanel}>
      <div className={styles.brandContent}>
        <div className={styles.brandLogo}>
          <img src={APP_LOGO_MARK} alt="" className={styles.brandLogoImg} />
        </div>
        <Typography.Title level={2} className={styles.brandTitle}>
          {t.demo.brandTitle}
        </Typography.Title>
        <Typography.Text className={styles.brandSubtitle}>{t.demo.brandSubtitle}</Typography.Text>

        <div className={styles.featureList}>
          {DEMO_BRAND_FEATURES.map(({ icon: Icon, text }) => (
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
          <Typography.Text className={styles.socialText}>{t.demo.brandSocial}</Typography.Text>
        </div>
      </div>
    </div>
  );
}

export default function DemoRequest() {
  const location = useLocation();
  const preferredSubscription = getPreferredSubscription(location.search);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async (values: {
    fullName: string;
    email: string;
    phone: string;
    businessName: string;
    message?: string;
    jobTitle?: string;
    city?: string;
    sector?: string;
  }) => {
    setError(null);
    setLoading(true);
    try {
      await submitDemoRequest({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        businessName: values.businessName,
        message: values.message || undefined,
        jobTitle: values.jobTitle || undefined,
        city: values.city || undefined,
        sector: values.sector || undefined,
        preferredPlanSlug: preferredSubscription?.plan,
        preferredBillingCycle: preferredSubscription?.billing,
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.demo.submitError);
      } else {
        setError(t.demo.submitError);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.wrapper}>
        <DemoBrandPanel />
        <div className={`${styles.formPanel} ${demoStyles.demoFormPanel}`}>
          <Card className={`${styles.card} ${demoStyles.demoCard}`} variant="borderless">
            <Result
              status="success"
              title={t.demo.successTitle}
              subTitle={t.demo.successSubtitle}
              extra={
                <Link to="/login">
                  <Button type="primary" size="large">
                    {t.demo.successButton}
                  </Button>
                </Link>
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <DemoBrandPanel />
      <div className={`${styles.formPanel} ${demoStyles.demoFormPanel}`}>
        <Card className={`${styles.card} ${demoStyles.demoCard}`} variant="borderless">
          <div className={styles.mobileBrand}>
            <div className={styles.mobileBrandIcon}>
              <img src={APP_LOGO_MARK} alt="" className={styles.mobileBrandImg} />
            </div>
            <span className={styles.mobileBrandName}>360 PME</span>
          </div>

          <div className={styles.logoBlock}>
            <Typography.Title level={4} style={{ color: "var(--color-primary)", marginBottom: 6 }}>
              {t.demo.pageTitle}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {t.demo.pageSubtitle}
            </Typography.Text>
          </div>

          <Alert
            type="info"
            showIcon
            message={t.demo.slaTitle}
            description={t.demo.slaDescription}
            className={demoStyles.compactAlert}
          />

          {preferredSubscription && (
            <Alert
              type="success"
              showIcon
              message="Plan demandé depuis la page tarifs"
              description={
                <span>
                  Nous avons noté votre choix :{" "}
                  <Tag color="blue" style={{ marginInlineEnd: 4 }}>
                    {PLAN_LABELS[preferredSubscription.plan]}
                  </Tag>
                  <Tag color="green">{BILLING_LABELS[preferredSubscription.billing]}</Tag>. Après
                  validation de votre accès, vous pourrez finaliser le paiement via PayDunya.
                </span>
              }
              className={demoStyles.compactAlert}
            />
          )}

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
            name="demo-request"
            layout="vertical"
            size="middle"
            onFinish={onFinish}
            autoComplete="off"
            className={styles.formBlock}
          >
            <Form.Item
              name="fullName"
              rules={[
                { required: true, message: t.validation.nameRequired },
                { min: 2, message: t.demo.minChars },
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
              name="phone"
              rules={[
                { required: true, message: t.demo.phoneRequired },
                { min: 8, message: t.demo.phoneTooShort },
              ]}
            >
              <Input
                prefix={<Phone size={18} />}
                placeholder="Ex. +221 77 123 45 67"
                autoComplete="tel"
              />
            </Form.Item>
            <Form.Item
              name="businessName"
              rules={[
                { required: true, message: t.demo.businessNameRequired },
                { min: 2, message: t.demo.minChars },
              ]}
            >
              <Input
                prefix={<Building2 size={18} />}
                placeholder="Nom de votre commerce / entreprise"
                autoComplete="organization"
              />
            </Form.Item>
            <Collapse
              ghost
              bordered={false}
              expandIconPosition="end"
              className={demoStyles.optionalCollapse}
              defaultActiveKey={[]}
              items={[
                {
                  key: "more",
                  label: t.demo.optionalCollapse,
                  children: (
                    <div className={demoStyles.optionalGrid}>
                      <Form.Item name="jobTitle" label={t.demo.labelJob}>
                        <Input
                          prefix={<Briefcase size={18} />}
                          placeholder={t.demo.placeholderJob}
                        />
                      </Form.Item>
                      <Form.Item name="city" label={t.demo.labelCity}>
                        <Input prefix={<MapPin size={18} />} placeholder={t.demo.placeholderCity} />
                      </Form.Item>
                      <Form.Item
                        name="sector"
                        label={t.demo.labelSector}
                        className={demoStyles.optionalGridFull}
                      >
                        <Input placeholder={t.demo.placeholderSector} />
                      </Form.Item>
                      <Form.Item
                        name="message"
                        label={t.demo.labelMessage}
                        className={demoStyles.optionalGridFull}
                      >
                        <Input.TextArea
                          placeholder={t.demo.placeholderMessage}
                          rows={3}
                          showCount
                          maxLength={2000}
                        />
                      </Form.Item>
                    </div>
                  ),
                },
              ]}
            />

            <Form.Item className={styles.submitBlock}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className={styles.submitBtn}
              >
                {t.demo.submit}
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.footer}>
            <Typography.Text type="secondary">
              {t.demo.footerAlready}{" "}
              <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 500 }}>
                {t.demo.footerLogin}
              </Link>
            </Typography.Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
