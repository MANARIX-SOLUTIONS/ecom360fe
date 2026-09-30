import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Typography, Button, Modal, Form, Input, Radio, Space, message } from "antd";
import { Store, Plus, MapPin, Check, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import { useAuthRole } from "@/hooks/useAuthRole";
import { useBusinessProfile } from "@/contexts/BusinessProfileContext";
import { getSubscriptionUsage, updateBusinessCatalogMode } from "@/api";
import type { CatalogMode } from "@/api/business";
import { EmptyState } from "@/components/EmptyState";
import { ROLES } from "@/constants/roles";
import { t } from "@/i18n";
import { confirmDelete } from "@/utils/confirmDelete";
import styles from "./SettingsStores.module.css";
import layoutStyles from "./Settings.module.css";

export default function SettingsStores() {
  const navigate = useNavigate();
  const { stores, activeStore, setActiveStoreId, addStore, updateStore, removeStore, hasStores } =
    useStore();
  const { matrixCan } = useMatrixCan();
  const { role, isSuperAdmin } = useAuthRole();
  const { profile, refresh: refreshProfile } = useBusinessProfile();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [storesAtLimit, setStoresAtLimit] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const catalogMode: CatalogMode = profile?.catalogMode === "SHARED" ? "SHARED" : "PER_STORE";
  const canEditCatalog = role === ROLES.PROPRIETAIRE || isSuperAdmin;

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

  const applyCatalogMode = async (next: CatalogMode) => {
    setSavingCatalog(true);
    try {
      await updateBusinessCatalogMode(next);
      await refreshProfile();
      message.success(t.stores.catalogModeUpdated);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleCatalogModeChange = (next: CatalogMode) => {
    if (next === catalogMode || savingCatalog) return;
    if (next === "SHARED") {
      Modal.confirm({
        title: t.stores.catalogModeSharedConfirmTitle,
        content: t.stores.catalogModeSharedWarning,
        okText: t.common.save,
        cancelText: t.common.cancel,
        onOk: () => applyCatalogMode(next),
      });
      return;
    }
    void applyCatalogMode(next);
  };

  const handleRemove = (store: { id: string; name: string }) => {
    confirmDelete({
      name: store.name,
      onOk: async () => {
        await removeStore(store.id);
        message.success(t.stores.msgDeleted);
      },
    });
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
        ) : matrixCan("STORES_CREATE", "settings:stores") ? (
          <Button type="primary" icon={<Plus size={18} />} onClick={openAdd}>
            {t.stores.addStore}
          </Button>
        ) : null}
      </header>

      <Card variant="borderless" className={styles.catalogCard}>
        <Typography.Title level={5} className={styles.catalogTitle}>
          {t.stores.catalogModeTitle}
        </Typography.Title>
        <Typography.Paragraph type="secondary" className={styles.catalogDesc}>
          {t.stores.catalogModeDesc}
        </Typography.Paragraph>
        <Radio.Group
          value={catalogMode}
          disabled={!canEditCatalog || savingCatalog}
          onChange={(e) => handleCatalogModeChange(e.target.value as CatalogMode)}
        >
          <Space direction="vertical" size={12}>
            <Radio value="PER_STORE">
              <span className={styles.catalogOption}>
                <span className={styles.catalogOptionTitle}>{t.stores.catalogModePerStore}</span>
                <span className={styles.catalogOptionDesc}>{t.stores.catalogModePerStoreDesc}</span>
              </span>
            </Radio>
            <Radio value="SHARED">
              <span className={styles.catalogOption}>
                <span className={styles.catalogOptionTitle}>{t.stores.catalogModeShared}</span>
                <span className={styles.catalogOptionDesc}>{t.stores.catalogModeSharedDesc}</span>
              </span>
            </Radio>
          </Space>
        </Radio.Group>
        {catalogMode === "SHARED" ? (
          <Typography.Paragraph type="secondary" className={styles.catalogWarning}>
            {t.stores.catalogModeSharedWarning}
          </Typography.Paragraph>
        ) : null}
      </Card>

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
                      onClick={() => handleRemove(store)}
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
