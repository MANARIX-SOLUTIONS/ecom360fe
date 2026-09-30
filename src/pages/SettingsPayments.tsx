import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Result,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeft, Copy, Lock } from "lucide-react";
import dayjs from "dayjs";
import { t } from "@/i18n";
import { ROLES } from "@/constants/roles";
import { useAuthRole } from "@/hooks/useAuthRole";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { getApiBaseUrl } from "@/api/apiBase";
import {
  getBictorysSettings,
  saveBictorysSettings,
  testBictorysSettings,
  type BictorysEnvironment,
  type BictorysSettingsResponse,
} from "@/api";
import styles from "./Settings.module.css";

type FormValues = {
  apiKey?: string;
  webhookSecret?: string;
  environment: BictorysEnvironment;
  country: string;
  enabled: boolean;
};

const COUNTRIES = [
  { value: "SN", label: "Sénégal" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "ML", label: "Mali" },
  { value: "BF", label: "Burkina Faso" },
  { value: "BJ", label: "Bénin" },
  { value: "TG", label: "Togo" },
  { value: "CM", label: "Cameroun" },
];

function toFormValues(res: BictorysSettingsResponse | null): FormValues {
  return {
    apiKey: "",
    webhookSecret: "",
    environment: res?.environment ?? "test",
    country: res?.country ?? "SN",
    enabled: res?.configured ? res.enabled : true,
  };
}

function absoluteWebhookUrl(path: string): string {
  const base = (getApiBaseUrl() || window.location.origin).replace(/\/$/, "");
  return `${base}${path}`;
}

export default function SettingsPayments() {
  const navigate = useNavigate();
  const { role, isSuperAdmin } = useAuthRole();
  const { canPosOnlinePayment, ready: isPlanReady } = usePlanFeatures();
  const isOwner = role === ROLES.PROPRIETAIRE || isSuperAdmin;

  const [settings, setSettings] = useState<BictorysSettingsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const canManage = isOwner && canPosOnlinePayment;

  useEffect(() => {
    if (!canManage) return;
    setIsLoading(true);
    setLoadError(null);
    getBictorysSettings()
      .then(setSettings)
      .catch((e) => setLoadError(e instanceof Error ? e.message : t.settings.paymentsLoadError))
      .finally(() => setIsLoading(false));
  }, [canManage]);

  const handleSave = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const res = await saveBictorysSettings({
        apiKey: values.apiKey?.trim() || undefined,
        webhookSecret: values.webhookSecret?.trim() || undefined,
        environment: values.environment,
        country: values.country,
        enabled: values.enabled,
      });
      setSettings(res);
      form.setFieldsValue(toFormValues(res));
      message.success(t.settings.paymentsSaved);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const res = await testBictorysSettings();
      if (res.ok) message.success(res.message || t.settings.paymentsTestOk);
      else message.error(res.message);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setIsTesting(false);
    }
  };

  const webhookUrl = settings?.webhookPath ? absoluteWebhookUrl(settings.webhookPath) : null;
  const copyWebhookUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      message.success(t.settings.paymentsWebhookCopied);
    } catch {
      message.error(t.common.errorGeneric);
    }
  };

  const isConfigured = !!settings?.configured;
  const statusTag = !isConfigured ? (
    <Tag>{t.settings.paymentsStatusNotConfigured}</Tag>
  ) : settings?.enabled ? (
    <Tag color="success">{t.settings.paymentsStatusConfigured}</Tag>
  ) : (
    <Tag color="warning">{t.settings.paymentsStatusDisabled}</Tag>
  );

  return (
    <div className={`${styles.settingsPage} pageWrapper`}>
      <button type="button" className={styles.settingsBack} onClick={() => navigate("/settings")}>
        <ArrowLeft size={18} />
        {t.common.back}
      </button>

      <header className={styles.settingsPageHeader}>
        <Typography.Title level={4} className={styles.settingsPageTitle}>
          {t.settings.paymentsTitle}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
          {t.settings.paymentsHint}
        </Typography.Text>
      </header>

      {!isPlanReady ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : !canPosOnlinePayment ? (
        <Card variant="borderless" className={styles.settingsCard}>
          <Result
            icon={<Lock size={40} />}
            title={t.settings.paymentsLockedTitle}
            subTitle={t.settings.paymentsLockedDesc}
            extra={
              <Button type="primary" onClick={() => navigate("/settings/subscription")}>
                {t.pos.onlinePayUpsellLink}
              </Button>
            }
          />
        </Card>
      ) : !isOwner ? (
        <Alert type="info" showIcon message={t.settings.paymentsOwnerOnly} />
      ) : isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : loadError ? (
        <Typography.Paragraph style={{ color: "var(--color-danger)" }} copyable>
          {loadError}
        </Typography.Paragraph>
      ) : (
        <>
          <Card
            variant="borderless"
            className={styles.settingsCard}
            title={t.settings.paymentsAccountCard}
            extra={statusTag}
          >
            <Form<FormValues>
              form={form}
              layout="vertical"
              requiredMark="optional"
              initialValues={toFormValues(settings)}
              onFinish={handleSave}
            >
              <Form.Item
                name="apiKey"
                label={t.settings.paymentsApiKey}
                extra={
                  settings?.apiKeyMasked
                    ? t.settings.paymentsKeepStored.replace("{masked}", settings.apiKeyMasked)
                    : undefined
                }
                rules={
                  settings?.apiKeyMasked
                    ? []
                    : [{ required: true, message: t.settings.paymentsApiKeyRequired }]
                }
              >
                <Input.Password
                  autoComplete="off"
                  placeholder={t.settings.paymentsApiKeyPlaceholder}
                />
              </Form.Item>
              <Form.Item
                name="webhookSecret"
                label={t.settings.paymentsWebhookSecret}
                extra={
                  settings?.webhookSecretMasked
                    ? t.settings.paymentsKeepStored.replace(
                        "{masked}",
                        settings.webhookSecretMasked
                      )
                    : undefined
                }
                rules={
                  settings?.webhookSecretMasked
                    ? []
                    : [{ required: true, message: t.settings.paymentsWebhookSecretRequired }]
                }
              >
                <Input.Password
                  autoComplete="off"
                  placeholder={t.settings.paymentsWebhookSecretPlaceholder}
                />
              </Form.Item>
              <Space wrap size="large" style={{ width: "100%" }}>
                <Form.Item name="environment" label={t.settings.paymentsEnvironment}>
                  <Select
                    style={{ minWidth: 200 }}
                    options={[
                      { value: "test", label: t.settings.paymentsEnvTest },
                      { value: "live", label: t.settings.paymentsEnvLive },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="country" label={t.settings.paymentsCountry}>
                  <Select style={{ minWidth: 200 }} options={COUNTRIES} />
                </Form.Item>
              </Space>
              <Form.Item
                name="enabled"
                label={t.settings.paymentsEnabled}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={isSaving}>
                  {t.common.save}
                </Button>
                <Button onClick={handleTest} loading={isTesting} disabled={!isConfigured}>
                  {t.settings.paymentsTest}
                </Button>
              </Space>
              {settings?.updatedAt && (
                <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                  {t.settings.paymentsUpdatedAt.replace(
                    "{date}",
                    dayjs(settings.updatedAt).format("DD/MM/YYYY HH:mm")
                  )}
                </Typography.Paragraph>
              )}
            </Form>
          </Card>

          <Card
            variant="borderless"
            className={styles.settingsCard}
            title={t.settings.paymentsWebhookCard}
          >
            {webhookUrl ? (
              <>
                <Typography.Paragraph type="secondary">
                  {t.settings.paymentsWebhookHint}
                </Typography.Paragraph>
                <Space.Compact style={{ width: "100%" }}>
                  <Input readOnly value={webhookUrl} />
                  <Button icon={<Copy size={16} />} onClick={copyWebhookUrl} aria-label="Copier" />
                </Space.Compact>
              </>
            ) : (
              <Typography.Text type="secondary">
                {t.settings.paymentsWebhookAfterSave}
              </Typography.Text>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
