import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Typography, Button, Modal, Form, Input, message } from "antd";
import { Store, Plus, MapPin, Check, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { usePermissions } from "@/hooks/usePermissions";
import { getSubscriptionUsage } from "@/api";
import { t } from "@/i18n";
import styles from "./SettingsStores.module.css";
import layoutStyles from "./Settings.module.css";

export default function SettingsStores() {
  const navigate = useNavigate();
  const { stores, activeStore, setActiveStoreId, addStore, updateStore, removeStore, hasStores } =
    useStore();
  const { can } = usePermissions();
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
        message.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm(t.common.delete + " ?")) return;
    try {
      await removeStore(id);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className={`${layoutStyles.settingsPage} pageWrapper`}>
      <button
        type="button"
        className={layoutStyles.settingsBack}
        onClick={() => navigate("/settings")}
      >
        <ArrowLeft size={18} />
        {t.common.back}
      </button>

      <header className={styles.header}>
        <div>
          <Typography.Title level={4} className={layoutStyles.settingsPageTitle}>
            {t.stores.title}
          </Typography.Title>
          <Typography.Text type="secondary" className={layoutStyles.settingsPageSubtitle}>
            {t.stores.titleDesc}
          </Typography.Text>
        </div>
        {storesAtLimit ? (
          <Typography.Text type="secondary">
            Limite atteinte. <Link to="/settings/subscription">Passer à un plan supérieur</Link>
          </Typography.Text>
        ) : can("STORES_CREATE") ? (
          <Button type="primary" icon={<Plus size={18} />} onClick={openAdd}>
            {t.stores.addStore}
          </Button>
        ) : null}
      </header>

      <Card variant="borderless" className={styles.card}>
        {!hasStores ? (
          <div className={styles.emptyHero}>
            <div className={styles.emptyIconWrap}>
              <Store size={36} strokeWidth={1.5} />
            </div>
            <Typography.Title level={4} className={styles.emptyTitle}>
              {t.stores.emptyTitle}
            </Typography.Title>
            <Typography.Text type="secondary" className={styles.emptySubtitle}>
              Créez votre premier point de vente pour commencer à utiliser 360 PME. Gérez vos
              stocks, enregistrez des ventes et suivez votre activité.
            </Typography.Text>
            {!storesAtLimit && can("STORES_CREATE") && (
              <Button
                type="primary"
                size="large"
                icon={<Plus size={18} />}
                onClick={openAdd}
                style={{ marginTop: 20, height: 48 }}
              >
                Créer ma première boutique
              </Button>
            )}
          </div>
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
                  {can("STORES_UPDATE") && (
                    <Button
                      type="text"
                      size="small"
                      icon={<Pencil size={14} />}
                      onClick={() => openEdit(store.id)}
                      aria-label={t.common.edit}
                    />
                  )}
                  {can("STORES_DELETE") && (
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
    </div>
  );
}
