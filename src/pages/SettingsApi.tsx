import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  Tabs,
  Space,
  Alert,
  message,
  Skeleton,
} from "antd";
import { ArrowLeft, Plus, Trash2, Copy, KeyRound, Webhook, Send } from "lucide-react";
import dayjs from "dayjs";
import { t } from "@/i18n";
import { EmptyState } from "@/components/EmptyState";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  type ApiKeyResponse,
  type WebhookResponse,
  type WebhookCreateResponse,
} from "@/api";
import styles from "./Settings.module.css";

export default function SettingsApi() {
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();

  const canCreateKey = matrixCan("API_KEYS_CREATE", "settings:api");
  const canRevokeKey = matrixCan("API_KEYS_DELETE", "settings:api");
  const canCreateWh = matrixCan("WEBHOOKS_CREATE", "settings:api");
  const canUpdateWh = matrixCan("WEBHOOKS_UPDATE", "settings:api");
  const canDeleteWh = matrixCan("WEBHOOKS_DELETE", "settings:api");

  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookResponse[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [loadingWh, setLoadingWh] = useState(true);

  const [keyModal, setKeyModal] = useState(false);
  const [whModal, setWhModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [keyForm] = Form.useForm();
  const [whForm] = Form.useForm();

  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      setKeys(await listApiKeys());
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.settings.apiKeysLoadError);
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  const loadWebhooks = useCallback(async () => {
    setLoadingWh(true);
    try {
      setWebhooks(await listWebhooks());
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.settings.webhooksLoadError);
    } finally {
      setLoadingWh(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
    void loadWebhooks();
  }, [loadKeys, loadWebhooks]);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(t.settings.commerceCopied);
    } catch {
      message.error(t.settings.commerceCopyError);
    }
  };

  const handleCreateKey = async () => {
    try {
      const values = await keyForm.validateFields();
      setCreating(true);
      const created = await createApiKey({
        label: values.label.trim(),
        permissions: values.permissions.trim(),
        expiresAt: values.expiresAt || null,
      });
      setKeyModal(false);
      keyForm.resetFields();
      setCreatedKey(created.rawKey ?? null);
      message.success(t.settings.apiKeyCreated);
      await loadKeys();
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : t.settings.apiKeyCreateError);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = (key: ApiKeyResponse) => {
    Modal.confirm({
      title: t.settings.apiKeyRevokeTitle,
      content: t.settings.apiKeyRevokeDesc.replace("{label}", key.label),
      okText: t.settings.apiKeyRevoke,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await revokeApiKey(key.id);
          message.success(t.settings.apiKeyRevoked);
          await loadKeys();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.settings.apiKeyRevokeError);
        }
      },
    });
  };

  const handleCreateWebhook = async () => {
    try {
      const values = await whForm.validateFields();
      setCreating(true);
      const created: WebhookCreateResponse = await createWebhook({
        url: values.url.trim(),
        events: values.events.trim(),
        isActive: values.isActive ?? true,
      });
      setWhModal(false);
      whForm.resetFields();
      setCreatedSecret(created.secret);
      message.success(t.settings.webhookCreated);
      await loadWebhooks();
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : t.settings.webhookCreateError);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleWebhook = async (wh: WebhookResponse, active: boolean) => {
    try {
      await updateWebhook(wh.id, {
        url: wh.url,
        events: wh.events,
        isActive: active,
      });
      message.success(t.settings.webhookUpdated);
      await loadWebhooks();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.settings.webhookUpdateError);
    }
  };

  const handleDeleteWebhook = (wh: WebhookResponse) => {
    Modal.confirm({
      title: t.settings.webhookDeleteTitle,
      content: wh.url,
      okText: t.common.delete,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteWebhook(wh.id);
          message.success(t.settings.webhookDeleted);
          await loadWebhooks();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.settings.webhookDeleteError);
        }
      },
    });
  };

  const handleTestWebhook = async (wh: WebhookResponse) => {
    setTestingId(wh.id);
    try {
      const res = await testWebhook(wh.id);
      if (res.success) {
        message.success(
          t.settings.webhookTestSuccess
            .replace("{status}", String(res.httpStatus))
            .replace("{ms}", String(res.durationMs))
        );
      } else {
        message.error(
          t.settings.webhookTestFail.replace(
            "{msg}",
            res.message || `HTTP ${res.httpStatus || "?"}`
          )
        );
      }
    } catch (e) {
      message.error(
        e instanceof Error ? e.message : t.settings.webhookTestFail.replace("{msg}", "")
      );
    } finally {
      setTestingId(null);
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
          {t.settings.apiTitle}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
          {t.settings.apiHint}
        </Typography.Text>
      </header>

      <Card variant="borderless" className={styles.settingsCard}>
        <Tabs
          items={[
            {
              key: "keys",
              label: t.settings.apiKeysTab,
              children: (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: 12,
                    }}
                  >
                    {canCreateKey && (
                      <Button
                        type="primary"
                        icon={<Plus size={16} />}
                        onClick={() => setKeyModal(true)}
                      >
                        {t.settings.apiKeyCreate}
                      </Button>
                    )}
                  </div>
                  {loadingKeys ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : keys.length === 0 ? (
                    <EmptyState
                      icon={KeyRound}
                      title={t.settings.apiKeysEmptyTitle}
                      description={t.settings.apiKeysEmptyDesc}
                      action={
                        canCreateKey ? (
                          <Button
                            type="primary"
                            icon={<Plus size={16} />}
                            onClick={() => setKeyModal(true)}
                          >
                            {t.settings.apiKeyCreate}
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <Table
                      rowKey="id"
                      dataSource={keys}
                      pagination={false}
                      columns={[
                        {
                          title: t.settings.apiKeyLabel,
                          dataIndex: "label",
                          render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
                        },
                        {
                          title: t.settings.apiKeyPermissions,
                          dataIndex: "permissions",
                          render: (v: string) => (
                            <Typography.Text code style={{ fontSize: 12 }}>
                              {v}
                            </Typography.Text>
                          ),
                        },
                        {
                          title: t.settings.apiKeyExpires,
                          dataIndex: "expiresAt",
                          render: (d: string | null) =>
                            d ? dayjs(d).format("DD/MM/YYYY") : t.settings.apiKeyNoExpiry,
                        },
                        {
                          title: t.settings.commerceColStatus,
                          dataIndex: "isActive",
                          render: (active: boolean) => (
                            <Tag color={active ? "success" : "default"}>
                              {active ? t.settings.apiKeyActive : t.settings.apiKeyRevokedLabel}
                            </Tag>
                          ),
                        },
                        {
                          title: t.settings.commerceColDate,
                          dataIndex: "createdAt",
                          render: (d: string) => dayjs(d).format("DD/MM/YYYY"),
                        },
                        {
                          title: t.common.actions,
                          key: "actions",
                          render: (_: unknown, row: ApiKeyResponse) =>
                            canRevokeKey && row.isActive ? (
                              <Button
                                type="text"
                                danger
                                icon={<Trash2 size={16} />}
                                onClick={() => handleRevokeKey(row)}
                              >
                                {t.settings.apiKeyRevoke}
                              </Button>
                            ) : null,
                        },
                      ]}
                    />
                  )}
                </>
              ),
            },
            {
              key: "webhooks",
              label: t.settings.webhooksTab,
              children: (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: 12,
                    }}
                  >
                    {canCreateWh && (
                      <Button
                        type="primary"
                        icon={<Plus size={16} />}
                        onClick={() => setWhModal(true)}
                      >
                        {t.settings.webhookCreate}
                      </Button>
                    )}
                  </div>
                  {loadingWh ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : webhooks.length === 0 ? (
                    <EmptyState
                      icon={Webhook}
                      title={t.settings.webhooksEmptyTitle}
                      description={t.settings.webhooksEmptyDesc}
                      action={
                        canCreateWh ? (
                          <Button
                            type="primary"
                            icon={<Plus size={16} />}
                            onClick={() => setWhModal(true)}
                          >
                            {t.settings.webhookCreate}
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <Table
                      rowKey="id"
                      dataSource={webhooks}
                      pagination={false}
                      columns={[
                        {
                          title: t.settings.webhookUrl,
                          dataIndex: "url",
                          render: (url: string) => (
                            <Typography.Text
                              code
                              style={{ fontSize: 12, maxWidth: 280 }}
                              ellipsis={{ tooltip: url }}
                            >
                              {url}
                            </Typography.Text>
                          ),
                        },
                        {
                          title: t.settings.webhookEvents,
                          dataIndex: "events",
                        },
                        {
                          title: t.settings.apiKeyActive,
                          dataIndex: "isActive",
                          render: (active: boolean, row: WebhookResponse) => (
                            <Switch
                              checked={active}
                              disabled={!canUpdateWh}
                              onChange={(v) => void handleToggleWebhook(row, v)}
                            />
                          ),
                        },
                        {
                          title: t.common.actions,
                          key: "actions",
                          render: (_: unknown, row: WebhookResponse) => (
                            <Space>
                              {canUpdateWh && (
                                <Button
                                  type="text"
                                  icon={<Send size={16} />}
                                  loading={testingId === row.id}
                                  disabled={!row.isActive}
                                  onClick={() => void handleTestWebhook(row)}
                                >
                                  {t.settings.webhookTest}
                                </Button>
                              )}
                              {canDeleteWh && (
                                <Button
                                  type="text"
                                  danger
                                  icon={<Trash2 size={16} />}
                                  onClick={() => handleDeleteWebhook(row)}
                                />
                              )}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  )}
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={t.settings.apiKeyCreate}
        open={keyModal}
        onCancel={() => setKeyModal(false)}
        onOk={() => void handleCreateKey()}
        confirmLoading={creating}
        okText={t.settings.apiKeyCreate}
        destroyOnHidden
      >
        <Form
          form={keyForm}
          layout="vertical"
          initialValues={{ permissions: "read:products,read:sales" }}
        >
          <Form.Item
            name="label"
            label={t.settings.apiKeyLabel}
            rules={[{ required: true, message: t.settings.apiKeyLabelRequired }]}
          >
            <Input placeholder={t.settings.apiKeyLabelPlaceholder} maxLength={255} />
          </Form.Item>
          <Form.Item
            name="permissions"
            label={t.settings.apiKeyPermissions}
            rules={[{ required: true, message: t.settings.apiKeyPermissionsRequired }]}
            extra={t.settings.apiKeyPermissionsHint}
          >
            <Input placeholder="read:products,read:sales" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.settings.webhookCreate}
        open={whModal}
        onCancel={() => setWhModal(false)}
        onOk={() => void handleCreateWebhook()}
        confirmLoading={creating}
        okText={t.settings.webhookCreate}
        destroyOnHidden
      >
        <Form
          form={whForm}
          layout="vertical"
          initialValues={{ isActive: true, events: "sale.created" }}
        >
          <Form.Item
            name="url"
            label={t.settings.webhookUrl}
            rules={[
              { required: true, message: t.settings.webhookUrlRequired },
              { type: "url", message: t.settings.webhookUrlInvalid },
            ]}
          >
            <Input placeholder="https://example.com/hooks/ecom360" maxLength={500} />
          </Form.Item>
          <Form.Item
            name="events"
            label={t.settings.webhookEvents}
            rules={[{ required: true, message: t.settings.webhookEventsRequired }]}
            extra={t.settings.webhookEventsHint}
          >
            <Input placeholder="sale.created,sale.updated" maxLength={500} />
          </Form.Item>
          <Form.Item name="isActive" label={t.settings.apiKeyActive} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.settings.apiKeySecretsTitle}
        open={!!createdKey}
        onCancel={() => setCreatedKey(null)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setCreatedKey(null)}>
            {t.common.close}
          </Button>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          message={t.settings.apiKeySecretsWarn}
          style={{ marginBottom: 12 }}
        />
        <Space style={{ display: "flex" }}>
          <Typography.Text code style={{ flex: 1, wordBreak: "break-all" }}>
            {createdKey}
          </Typography.Text>
          <Button
            icon={<Copy size={14} />}
            onClick={() => createdKey && void copyText(createdKey)}
          />
        </Space>
      </Modal>

      <Modal
        title={t.settings.webhookSecretsTitle}
        open={!!createdSecret}
        onCancel={() => setCreatedSecret(null)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setCreatedSecret(null)}>
            {t.common.close}
          </Button>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          message={t.settings.webhookSecretsWarn}
          style={{ marginBottom: 12 }}
        />
        <Space style={{ display: "flex" }}>
          <Typography.Text code style={{ flex: 1, wordBreak: "break-all" }}>
            {createdSecret}
          </Typography.Text>
          <Button
            icon={<Copy size={14} />}
            onClick={() => createdSecret && void copyText(createdSecret)}
          />
        </Space>
      </Modal>
    </div>
  );
}
