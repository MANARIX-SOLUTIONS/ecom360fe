import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Table, Tag, Button, Input, Typography, Skeleton, Modal, Form, message } from "antd";
import { Plus, Search, Truck, Pencil, Trash2 } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Clients.module.css";
import {
  listSuppliers,
  createSupplier,
  deleteSupplier,
  updateSupplier,
  getSubscriptionUsage,
} from "@/api";
import { usePermissions } from "@/hooks/usePermissions";

type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  zone: string;
  balance: number;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Suppliers() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Supplier | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [suppliersAtLimit, setSuppliersAtLimit] = useState(false);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) =>
        setSuppliersAtLimit(u.suppliersLimit > 0 && u.suppliersCount >= u.suppliersLimit)
      )
      .catch(() => setSuppliersAtLimit(false));
  }, [suppliers.length]);

  const fetchSuppliers = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listSuppliers({ page: 0, size: 200 });
      setSuppliers(
        res.content.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          zone: c.zone || "",
          balance: c.balance ?? 0,
        }))
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search)) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
      (s.zone && s.zone.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 130, height: 28 }} />
          <div className={styles.toolbar}>
            <Skeleton.Input active style={{ width: 240, height: 44 }} />
            <Skeleton.Button active style={{ width: 180, height: 44 }} />
          </div>
        </div>
        <Card bordered={false} className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <Typography.Title level={4} className="pageTitle">
          {t.suppliers.title}
        </Typography.Title>
        <div className={styles.toolbar}>
          <Input
            prefix={<Search size={18} />}
            placeholder={t.products.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className={styles.toolbarSearch}
          />
          {suppliersAtLimit ? (
            <Typography.Text type="secondary">
              Limite atteinte. <Link to="/settings/subscription">Passer à un plan supérieur</Link>
            </Typography.Text>
          ) : can("SUPPLIERS_CREATE") ? (
            <Button type="primary" icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>
              {t.suppliers.addSupplier}
            </Button>
          ) : null}
        </div>
      </header>
      <Card bordered={false} className={`${styles.card} contentCard`}>
        {suppliers.length === 0 ? (
          <div className={styles.emptyHero}>
            <div className={styles.emptyIconWrap}>
              <Truck size={36} strokeWidth={1.5} />
            </div>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              Aucun fournisseur
            </Typography.Title>
            <Typography.Text
              type="secondary"
              style={{ maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}
            >
              Ajoutez vos fournisseurs pour suivre vos achats et gérer vos approvisionnements.
            </Typography.Text>
            {!suppliersAtLimit && can("SUPPLIERS_CREATE") && (
              <Button
                type="primary"
                size="large"
                icon={<Truck size={16} />}
                onClick={() => setAddOpen(true)}
                style={{ marginTop: 20, height: 48 }}
              >
                Ajouter un fournisseur
              </Button>
            )}
          </div>
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={filtered}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              onRow={(r) => ({
                style: { cursor: "pointer" },
                role: "button",
                tabIndex: 0,
                onClick: () => navigate(`/suppliers/${r.id}`),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/suppliers/${r.id}`);
                  }
                },
              })}
              className="dataTable"
              locale={{ emptyText: "Aucun fournisseur trouvé" }}
              columns={[
                {
                  title: t.common.name,
                  dataIndex: "name",
                  render: (name: string) => (
                    <span className={styles.nameCell}>
                      <span className={styles.avatarSmall}>{getInitials(name)}</span>
                      {name}
                    </span>
                  ),
                },
                { title: t.common.phone, dataIndex: "phone" },
                { title: t.common.email, dataIndex: "email" },
                { title: t.common.zone, dataIndex: "zone" },
                {
                  title: t.suppliers.balance,
                  dataIndex: "balance",
                  render: (v: number) => (
                    <Tag color={v < 0 ? "error" : "default"}>{v.toLocaleString("fr-FR")} F</Tag>
                  ),
                },
                {
                  title: "",
                  width: 100,
                  render: (_, r: Supplier) => (
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- stopPropagation only, not interactive
                    <div
                      role="group"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {can("SUPPLIERS_UPDATE") && (
                        <Button
                          type="text"
                          size="small"
                          icon={<Pencil size={14} />}
                          onClick={() => {
                            editForm.setFieldsValue({
                              name: r.name,
                              phone: r.phone || "",
                              email: r.email || "",
                              zone: r.zone || "",
                            });
                            setEditOpen(r);
                          }}
                          aria-label={t.common.edit}
                        />
                      )}
                      {can("SUPPLIERS_DELETE") && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<Trash2 size={14} />}
                          onClick={() => {
                            if (window.confirm(t.common.delete + " ?")) {
                              deleteSupplier(r.id)
                                .then(() => {
                                  message.success("Fournisseur supprimé");
                                  fetchSuppliers();
                                })
                                .catch((e) =>
                                  message.error(e instanceof Error ? e.message : "Erreur")
                                );
                            }
                          }}
                          aria-label={t.common.delete}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Modal
        title={t.suppliers.addSupplier}
        open={addOpen}
        onOk={() => {
          addForm.validateFields().then(async (values) => {
            try {
              await createSupplier({
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                zone: values.zone || undefined,
              });
              message.success("Fournisseur ajouté");
              setAddOpen(false);
              addForm.resetFields();
              fetchSuppliers();
            } catch (e) {
              message.error(e instanceof Error ? e.message : "Erreur");
            }
          });
        }}
        onCancel={() => {
          setAddOpen(false);
          addForm.resetFields();
        }}
        okText={t.products.save}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder="Nom du fournisseur" />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t.common.phone}
            rules={[
              {
                pattern: /^[\d\s+()-]{0,20}$/,
                message: t.validation.phoneInvalid,
              },
            ]}
          >
            <Input placeholder="33 123 45 67" />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.common.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item name="zone" label={t.common.zone}>
            <Input placeholder="ex. Zone 4, Dakar" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.suppliers.editSupplier}
        open={!!editOpen}
        onOk={() => {
          if (!editOpen) return;
          editForm.validateFields().then(async (values) => {
            try {
              await updateSupplier(editOpen.id, {
                name: values.name,
                phone: values.phone || undefined,
                email: values.email || undefined,
                zone: values.zone || undefined,
              });
              message.success("Fournisseur mis à jour");
              setEditOpen(null);
              editForm.resetFields();
              fetchSuppliers();
            } catch (e) {
              message.error(e instanceof Error ? e.message : "Erreur");
            }
          });
        }}
        onCancel={() => {
          setEditOpen(null);
          editForm.resetFields();
        }}
        okText={t.products.save}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder="Nom du fournisseur" />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t.common.phone}
            rules={[
              {
                pattern: /^[\d\s+()-]{0,20}$/,
                message: t.validation.phoneInvalid,
              },
            ]}
          >
            <Input placeholder="33 123 45 67" />
          </Form.Item>
          <Form.Item
            name="email"
            label={t.common.email}
            rules={[{ type: "email", message: t.validation.email }]}
          >
            <Input placeholder={t.validation.emailPlaceholder} />
          </Form.Item>
          <Form.Item name="zone" label={t.common.zone}>
            <Input placeholder="ex. Zone 4, Dakar" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
