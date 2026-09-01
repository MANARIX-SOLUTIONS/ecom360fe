import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Typography, Button, Modal, Form, Input, message } from "antd";
import { Store, Plus, MapPin, Check, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { getSubscriptionUsage } from "@/api";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, PageShell } from "@/components/ui";
import { t } from "@/i18n";
import styles from "./SettingsStores.module.css";
import layoutStyles from "./Settings.module.css";

export default function SettingsStores() {
  const navigate = useNavigate();
  const { stores, activeStore, setActiveStoreId, addStore, updateStore, removeStore, hasStores } =
    useStore();
  const { matrixCan } = useMatrixCan();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [storesAtLimit, setStoresAtLimit] = useState(false);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) => setStoresAtLimit(u.storesLimit > 0 && u.storesCount >= u.storesLimit))
      .catch(() => setStoresAtLimit(false));
  }, [stores.length]);

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const s = stores.find((x) => x.id === id);
    if (s) {
      setEditingId(id);
      form.setFieldsValue({ name: s.name, address: s.address ?? "" });
      setModalOpen(true);
    }
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const { name, address } = values;
      try {
        if (editingId) {
          await updateStore(editingId, { name, address: address || undefined });
        } else {
          await addStore({ name, address: address || undefined });
        }
        setModalOpen(false);
        form.resetFields();
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
      }
    });
  };

  const handleRemove = (id: string) => {
    const store = stores.find((s) => s.id === id);
    Modal.confirm({
      title: t.stores.deleteConfirmTitle,
      content: t.stores.deleteConfirmContent.replace("{name}", store?.name ?? ""),
      okText: t.common.delete,
      okButtonProps: { danger: true },
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await removeStore(id);
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
          return Promise.reject(e);
        }
      },
    });
  };

  return (
    <PageShell className={layoutStyles.settingsPage}>
      <PageHeader
        title={t.stores.title}
        subtitle={t.stores.titleDesc}
        onBack={() => navigate("/settings")}
        actions={
          storesAtLimit ? (
            <Typography.Text type="secondary">
              {t.products.limitReached}{" "}
              <Link to="/settings/subscription">{t.pos.upgradePlanLink}</Link>
            </Typography.Text>
          ) : matrixCan("STORES_CREATE", "settings:stores") ? (
            <Button type="primary" icon={<Plus size={18} />} onClick={openAdd}>
              {t.stores.addStore}
            </Button>
          ) : null
        }
      />

      <Card variant="borderless" className={styles.card}>
        {!hasStores ? (
          <EmptyState
            icon={Store}
            title={t.stores.emptyTitle}
            description={t.stores.emptyDesc}
            action={
              !storesAtLimit && matrixCan("STORES_CREATE", "settings:stores") ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<Plus size={18} />}
                  onClick={openAdd}
                  style={{ height: 48 }}
                >
                  {t.stores.emptyCta}
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className={styles.storeList}>
            {stores.map((store) => (
              <li key={store.id} className={styles.storeRow}>
                <div className={styles.storeInfo}>
                  <span className={styles.storeIcon}>
                    <Store size={20} />
                  </span>
                  <div className={styles.storeMeta}>
                    <span className={styles.storeName}>
                      {store.name}
                      {activeStore?.id === store.id && (
                        <span className={styles.activeBadge}>{t.stores.currentStore}</span>
                      )}
                    </span>
                    {store.address && (
                      <span className={styles.address}>
                        <MapPin size={14} /> {store.address}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.storeActions}>
                  <Button
                    type={activeStore?.id === store.id ? "primary" : "default"}
                    size="small"
                    icon={<Check size={14} />}
                    onClick={() => setActiveStoreId(store.id)}
                  >
                    {t.stores.setActive}
                  </Button>
                  {matrixCan("STORES_UPDATE", "settings:stores") && (
                    <Button
                      type="text"
                      size="small"
                      icon={<Pencil size={14} />}
                      onClick={() => openEdit(store.id)}
                      aria-label={t.common.edit}
                    />
                  )}
                  {matrixCan("STORES_DELETE", "settings:stores") && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<Trash2 size={14} />}
                      onClick={() => handleRemove(store.id)}
                      aria-label={t.common.delete}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        title={editingId ? t.common.edit : t.stores.addStore}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editingId ? t.common.save : t.common.add}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className={styles.form}>
          <Form.Item
            name="name"
            label={t.stores.storeName}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder={t.stores.storeName} />
          </Form.Item>
          <Form.Item name="address" label={t.stores.address}>
            <Input placeholder={t.stores.address} />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
