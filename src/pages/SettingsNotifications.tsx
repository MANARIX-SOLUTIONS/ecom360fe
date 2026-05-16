import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Switch, Button, Table, message, Spin } from "antd";
import { ArrowLeft, Bell, CheckCheck, Package, Wallet, CreditCard, Info } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/i18n";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/api";
import type { NotificationPreferenceResponse, NotificationResponse } from "@/api";
import { useNotifications } from "@/hooks/useNotifications";
import styles from "./Settings.module.css";

const NOTIFICATION_TYPE_ICONS: Record<string, typeof Bell> = {
  low_stock: Package,
  payment_received: Wallet,
  subscription: CreditCard,
  system: Info,
};

function notificationTypeLabel(type: string): string {
  switch (type) {
    case "low_stock":
      return t.settings.notificationTypeLowStock;
    case "payment_received":
      return t.settings.notificationTypePaymentReceived;
    case "subscription":
      return t.settings.notificationTypeSubscription;
    case "system":
      return t.settings.notificationTypeSystem;
    default:
      return type;
  }
}

export default function SettingsNotifications() {
  const navigate = useNavigate();
  const { refetch } = useNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferenceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.settings.notificationsPrefsLoadError);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await listNotifications({ page: 0, size: 50 });
      setNotifications(res.content);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
    loadNotifications();
  }, [loadPreferences, loadNotifications]);

  const handleToggle = async (type: string, enabled: boolean) => {
    setSaving(true);
    try {
      const updated = await updateNotificationPreferences({
        ...Object.fromEntries(preferences.map((p) => [p.type, p.enabled])),
        [type]: enabled,
      });
      setPreferences(updated);
      message.success(t.settings.notificationsPrefsUpdated);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.settings.notificationsPrefsUpdateError);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      await loadNotifications();
      refetch();
      message.success(t.settings.notificationsMarkAllSuccess);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      refetch();
    } catch {
      /* ignore */
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
          {t.settings.notifications}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.settingsPageSubtitle}>
          {t.settings.notificationsDesc}
        </Typography.Text>
      </header>

      <Card variant="borderless" className={styles.settingsCard}>
        <Typography.Text
          type="secondary"
          className={styles.settingsPageSubtitle}
          style={{ marginBottom: 20, display: "block" }}
        >
          {t.settings.notificationsTypesHeading}
        </Typography.Text>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {preferences.map((pref) => {
              const Icon = NOTIFICATION_TYPE_ICONS[pref.type] ?? Bell;
              const label = notificationTypeLabel(pref.type);
              return (
                <div
                  key={pref.type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(31, 58, 95, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-primary)",
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <Typography.Text strong>{label}</Typography.Text>
                  </div>
                  <Switch
                    checked={pref.enabled}
                    onChange={(checked) => handleToggle(pref.type, checked)}
                    disabled={saving}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card variant="borderless" className={styles.settingsCard}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Typography.Text strong>{t.settings.notificationsHistoryTitle}</Typography.Text>
          <Button
            type="default"
            icon={<CheckCheck size={16} />}
            onClick={handleMarkAllRead}
            loading={markingAll}
          >
            {t.settings.notificationsMarkAllRead}
          </Button>
        </div>
        {notifLoading ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            compact
            icon={Bell}
            title={t.settings.notificationsEmptyHistory}
            description={t.settings.notificationsEmptyHistoryDesc}
          />
        ) : (
          <Table
            size="small"
            dataSource={notifications}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: t.common.date,
                dataIndex: "createdAt",
                key: "createdAt",
                width: 140,
                render: (v: string) =>
                  v
                    ? new Date(v).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—",
              },
              {
                title: t.settings.notificationsColType,
                dataIndex: "type",
                key: "type",
                width: 120,
                render: (type: string) => notificationTypeLabel(type),
              },
              {
                title: t.settings.notificationsColTitle,
                dataIndex: "title",
                key: "title",
                ellipsis: true,
              },
              {
                title: "",
                key: "read",
                width: 80,
                render: (_: unknown, record: NotificationResponse) =>
                  !record.isRead ? (
                    <Button type="link" size="small" onClick={() => handleMarkRead(record.id)}>
                      {t.settings.notificationsMarkRead}
                    </Button>
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t.settings.notificationsReadStatus}
                    </Typography.Text>
                  ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
