import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  List,
  Modal,
  Segmented,
  Space,
  Typography,
  message,
} from "antd";
import { Bell } from "lucide-react";
import { sendAdminMaintenanceNotification } from "@/api/backoffice";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useNotifications } from "@/hooks/useNotifications";
import { formatAdminDateTime } from "@/utils/adminPeriod";
import styles from "./Backoffice.module.css";

export default function BackofficeNotifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, hasError, refetch, markRead, markAllRead } = useNotifications(
    {
      listSize: 50,
      pollingIntervalMs: 30000,
    }
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [form] = Form.useForm<{ title: string; message: string; statusPageUrl?: string }>();

  const items = useMemo(
    () => (filter === "unread" ? notifications.filter((item) => !item.isRead) : notifications),
    [filter, notifications]
  );

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} non lue${unreadCount > 1 ? "s" : ""}. Centre des alertes opérationnelles.`}
        extra={
          <Space wrap>
            <Segmented
              value={filter}
              onChange={(value) => setFilter(value as "all" | "unread")}
              options={[
                { label: "Toutes", value: "all" },
                { label: "Non lues", value: "unread" },
              ]}
            />
            <Button onClick={() => void markAllRead()} disabled={unreadCount === 0}>
              Tout marquer lu
            </Button>
            <Button type="primary" onClick={() => setOpen(true)}>
              Annonce de maintenance
            </Button>
          </Space>
        }
      />
      <Card variant="borderless" className={styles.card}>
        {hasError ? (
          <ErrorState
            compact
            title="Impossible de charger les notifications"
            onRetry={() => void refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            compact
            icon={Bell}
            title={filter === "unread" ? "Aucune notification non lue" : "Aucune notification"}
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                actions={[
                  !item.isRead ? (
                    <Button key="read" type="link" onClick={() => void markRead(item.id)}>
                      Marquer lu
                    </Button>
                  ) : null,
                ]}
              >
                <List.Item.Meta
                  title={
                    <button
                      type="button"
                      style={{
                        border: 0,
                        background: "none",
                        padding: 0,
                        cursor: item.actionUrl ? "pointer" : "default",
                        fontWeight: item.isRead ? 400 : 650,
                      }}
                      onClick={() => {
                        if (!item.isRead) void markRead(item.id);
                        if (item.actionUrl) navigate(item.actionUrl);
                      }}
                    >
                      {item.title}
                    </button>
                  }
                  description={
                    <>
                      <Typography.Text type="secondary">{item.body}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">
                        {formatAdminDateTime(item.createdAt)}
                      </Typography.Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
      <Modal
        title="Envoyer une annonce de maintenance"
        open={open}
        confirmLoading={saving}
        okText="Envoyer"
        cancelText="Annuler"
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          setSaving(true);
          try {
            const result = await sendAdminMaintenanceNotification(values);
            message.success(
              `Annonce envoyée à ${result.inAppRecipients} destinataire${result.inAppRecipients > 1 ? "s" : ""}.`
            );
            setOpen(false);
            form.resetFields();
          } catch (error) {
            message.error(error instanceof Error ? error.message : "Envoi impossible.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Titre"
            rules={[{ required: true, message: "Titre requis" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: "Message requis" }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="statusPageUrl" label="URL de statut (optionnel)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
