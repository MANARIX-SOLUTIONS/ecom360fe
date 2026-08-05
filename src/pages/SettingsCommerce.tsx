import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Alert,
  message,
  Skeleton,
} from "antd";
import { ArrowLeft, Plus, Trash2, Copy, ShoppingBag } from "lucide-react";
import dayjs from "dayjs";
import { t } from "@/i18n";
import { EmptyState } from "@/components/EmptyState";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { getApiBaseUrl } from "@/api/apiBase";
import {
  listCommerceConnections,
  createCommerceConnection,
  updateCommerceConnection,
  deleteCommerceConnection,
  listCommerceIngestions,
  listStores,
  type CommerceConnectionResponse,
  type CommerceConnectionCreateResponse,
  type CommerceIngestionLogResponse,
  type StoreResponse,
} from "@/api";
import styles from "./Settings.module.css";

const STATUS_COLOR: Record<string, string> = {
  PROCESSED: "success",
  RECEIVED: "processing",
  DUPLICATE_SKIPPED: "default",
  FAILED_VALIDATION: "error",
  FAILED: "error",
};

function absoluteWebhookUrl(path: string, woo = false): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const suffix = woo ? "/woocommerce" : "";
  return `${base}${path}${suffix}`;
}

function sourceLabel(sourceType: string): string {
  if (sourceType === "WOOCOMMERCE") return t.settings.commerceSourceWoo;
  if (sourceType === "GENERIC_WEBHOOK") return t.settings.commerceSourceGeneric;
  return sourceType;
}

export default function SettingsCommerce() {
  const navigate = useNavigate();
  const { matrixCan } = useMatrixCan();
  const canCreate = matrixCan("COMMERCE_CONNECTIONS_CREATE", "settings:commerce");
  const canUpdate = matrixCan("COMMERCE_CONNECTIONS_UPDATE", "settings:commerce");
  const canDelete = matrixCan("COMMERCE_CONNECTIONS_DELETE", "settings:commerce");

  const [connections, setConnections] = useState<CommerceConnectionResponse[]>([]);
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [logs, setLogs] = useState<CommerceIngestionLogResponse[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [connectionFilter, setConnectionFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdSecrets, setCreatedSecrets] = useState<CommerceConnectionCreateResponse | null>(
    null
  );
  const [form] = Form.useForm();

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [stores]);

  const connectionLabelById = useMemo(() => {
    const m = new Map<string, string>();
    connections.forEach((c) => m.set(c.id, c.label));
    return m;
  }, [connections]);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const [conns, storeList] = await Promise.all([listCommerceConnections(), listStores()]);
      setConnections(conns);
      setStores(storeList);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.settings.commerceLoadError);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await listCommerceIngestions({
        connectionId: connectionFilter,
        page: logPage,
        size: 20,
      });
      setLogs(res.content);
      setLogTotal(res.totalElements);
    } catch {
      setLogs([]);
      setLogTotal(0);
    } finally {
      setLogsLoading(false);
    }
  }, [connectionFilter, logPage]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(t.settings.commerceCopied);
    } catch {
      message.error(t.settings.commerceCopyError);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      const created = await createCommerceConnection({
        storeId: values.storeId,
        sourceType: values.sourceType,
        label: values.label.trim(),
      });
      setCreateOpen(false);
      form.resetFields();
      setCreatedSecrets(created);
      message.success(t.settings.commerceCreated);
      await loadConnections();
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : t.settings.commerceCreateError);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (conn: CommerceConnectionResponse, active: boolean) => {
    try {
      const updated = await updateCommerceConnection(conn.id, { isActive: active });
      setConnections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      message.success(active ? t.settings.commerceActivated : t.settings.commerceDeactivated);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.settings.commerceUpdateError);
    }
  };

  const handleDelete = (conn: CommerceConnectionResponse) => {
    Modal.confirm({
      title: t.settings.commerceDeleteTitle,
      content: t.settings.commerceDeleteDesc.replace("{label}", conn.label),
      okText: t.common.delete,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteCommerceConnection(conn.id);
          message.success(t.settings.commerceDeleted);
          if (connectionFilter === conn.id) setConnectionFilter(undefined);
          await loadConnections();
          await loadLogs();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.settings.commerceDeleteError);
        }
      },
    });
  };

  return (
    <div className={`${styles.settingsPage} ${styles.settingsPageWide} pageWrapper`}>
      <button type="button" className={styles.settingsBack} onClick={() => navigate("/settings")}>
        <ArrowLeft size={18} />
        {t.common.back}
      </button>

      <header className={styles.settingsPageHeader}>
        <Typography.Title level={4} className={styles.settingsPageTitle}>
          {t.settings.commerceTitle}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
          {t.settings.commerceHint}
        </Typography.Text>
      </header>

      <Card
        variant="borderless"
        className={styles.settingsCard}
        title={t.settings.commerceConnections}
        extra={
          canCreate ? (
            <div className={styles.settingsCardExtra}>
              <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                {t.settings.commerceConnect}
              </Button>
            </div>
          ) : null
        }
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : connections.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={t.settings.commerceEmptyTitle}
            description={t.settings.commerceEmptyDesc}
            action={
              canCreate ? (
                <Button
                  type="primary"
                  icon={<Plus size={16} />}
                  onClick={() => setCreateOpen(true)}
                >
                  {t.settings.commerceConnect}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="tableResponsive">
            <Table
              className="dataTable"
              rowKey="id"
              dataSource={connections}
              pagination={false}
              scroll={{ x: "max-content" }}
              columns={[
                {
                  title: t.settings.commerceLabel,
                  dataIndex: "label",
                  render: (label: string) => <Typography.Text strong>{label}</Typography.Text>,
                },
                {
                  title: t.settings.commerceSource,
                  dataIndex: "sourceType",
                  render: (s: string) => sourceLabel(s),
                },
                {
                  title: t.settings.commerceStore,
                  dataIndex: "storeId",
                  render: (id: string) => storeNameById.get(id) ?? id.slice(0, 8),
                },
                {
                  title: t.settings.commerceActive,
                  dataIndex: "isActive",
                  width: 100,
                  render: (active: boolean, row: CommerceConnectionResponse) => (
                    <Switch
                      checked={active}
                      disabled={!canUpdate}
                      onChange={(v) => void handleToggleActive(row, v)}
                    />
                  ),
                },
                {
                  title: t.settings.commerceWebhookUrl,
                  dataIndex: "incomingWebhookPath",
                  render: (_: string, row: CommerceConnectionResponse) => {
                    const url = absoluteWebhookUrl(
                      row.incomingWebhookPath,
                      row.sourceType === "WOOCOMMERCE"
                    );
                    return (
                      <Space size={4}>
                        <Typography.Text
                          code
                          style={{ fontSize: 12, maxWidth: 220 }}
                          ellipsis={{ tooltip: url }}
                        >
                          {url}
                        </Typography.Text>
                        <Button
                          type="text"
                          size="small"
                          icon={<Copy size={14} />}
                          onClick={() => void copyText(url)}
                          aria-label={t.settings.commerceCopy}
                        />
                      </Space>
                    );
                  },
                },
                {
                  title: t.common.actions,
                  key: "actions",
                  width: 80,
                  render: (_: unknown, row: CommerceConnectionResponse) =>
                    canDelete ? (
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDelete(row)}
                        aria-label={t.common.delete}
                      />
                    ) : null,
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Card
        variant="borderless"
        className={styles.settingsCard}
        style={{ marginTop: 16 }}
        title={t.settings.commerceJournal}
      >
        <div className={styles.settingsFilterBar}>
          <Select
            allowClear
            placeholder={t.settings.commerceFilterConnection}
            value={connectionFilter}
            onChange={(v) => {
              setConnectionFilter(v);
              setLogPage(0);
            }}
            options={connections.map((c) => ({ value: c.id, label: c.label }))}
          />
        </div>
        <div className="tableResponsive">
          <Table
            className="dataTable"
            rowKey="id"
            loading={logsLoading}
            dataSource={logs}
            locale={{ emptyText: t.settings.commerceJournalEmpty }}
            scroll={{ x: "max-content" }}
            pagination={{
              current: logPage + 1,
              pageSize: 20,
              total: logTotal,
              onChange: (p) => setLogPage(p - 1),
            }}
            columns={[
              {
                title: t.settings.commerceColDate,
                dataIndex: "createdAt",
                width: 150,
                render: (d: string) => dayjs(d).format("DD/MM/YYYY HH:mm"),
              },
              {
                title: t.settings.commerceLabel,
                dataIndex: "connectionId",
                render: (id: string) => connectionLabelById.get(id) ?? id.slice(0, 8),
              },
              {
                title: t.settings.commerceExternalOrder,
                dataIndex: "externalOrderId",
              },
              {
                title: t.settings.commerceColStatus,
                dataIndex: "status",
                render: (s: string) => (
                  <Tag color={STATUS_COLOR[s] || "default"}>
                    {(t.settings.commerceStatus as Record<string, string>)[s] ?? s}
                  </Tag>
                ),
              },
              {
                title: t.settings.commerceColError,
                dataIndex: "errorMessage",
                render: (msg: string | null) =>
                  msg ? (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                      {msg}
                    </Typography.Text>
                  ) : (
                    "—"
                  ),
              },
              {
                title: t.settings.commerceColSale,
                dataIndex: "saleId",
                render: (saleId: string | null) =>
                  saleId ? <Link to={`/sales`}>{saleId.slice(0, 8)}…</Link> : "—",
              },
            ]}
          />
        </div>
      </Card>

      <Modal
        title={t.settings.commerceConnect}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={creating}
        okText={t.settings.commerceConnect}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ sourceType: "WOOCOMMERCE" }}>
          <Form.Item
            name="label"
            label={t.settings.commerceLabel}
            rules={[{ required: true, message: t.settings.commerceLabelRequired }]}
          >
            <Input placeholder={t.settings.commerceLabelPlaceholder} maxLength={200} />
          </Form.Item>
          <Form.Item
            name="sourceType"
            label={t.settings.commerceSource}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "WOOCOMMERCE", label: t.settings.commerceSourceWoo },
                { value: "GENERIC_WEBHOOK", label: t.settings.commerceSourceGeneric },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="storeId"
            label={t.settings.commerceStore}
            rules={[{ required: true, message: t.settings.commerceStoreRequired }]}
          >
            <Select
              placeholder={t.settings.commerceStore}
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.settings.commerceSecretsTitle}
        open={!!createdSecrets}
        onCancel={() => setCreatedSecrets(null)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setCreatedSecrets(null)}>
            {t.common.close}
          </Button>,
        ]}
      >
        {createdSecrets && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert type="warning" showIcon message={t.settings.commerceSecretsWarn} />
            <div>
              <Typography.Text type="secondary">{t.settings.commerceWebhookUrl}</Typography.Text>
              <Space style={{ display: "flex", marginTop: 4 }}>
                <Typography.Text code style={{ flex: 1, wordBreak: "break-all" }}>
                  {absoluteWebhookUrl(
                    createdSecrets.incomingWebhookPath,
                    createdSecrets.sourceType === "WOOCOMMERCE"
                  )}
                </Typography.Text>
                <Button
                  icon={<Copy size={14} />}
                  onClick={() =>
                    void copyText(
                      absoluteWebhookUrl(
                        createdSecrets.incomingWebhookPath,
                        createdSecrets.sourceType === "WOOCOMMERCE"
                      )
                    )
                  }
                />
              </Space>
            </div>
            <div>
              <Typography.Text type="secondary">{t.settings.commerceHmacSecret}</Typography.Text>
              <Space style={{ display: "flex", marginTop: 4 }}>
                <Typography.Text code style={{ flex: 1, wordBreak: "break-all" }}>
                  {createdSecrets.hmacSecret}
                </Typography.Text>
                <Button
                  icon={<Copy size={14} />}
                  onClick={() => void copyText(createdSecrets.hmacSecret)}
                />
              </Space>
            </div>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
              {t.settings.commerceSignatureHint}
            </Typography.Paragraph>
          </Space>
        )}
      </Modal>
    </div>
  );
}
