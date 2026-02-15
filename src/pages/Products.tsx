import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Input,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  InputNumber,
  Select,
  Typography,
  Skeleton,
  message,
} from "antd";
import { Search, Plus, Pencil, Package, Trash2 } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Products.module.css";
import { useStore } from "@/contexts/StoreContext";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getStockByStore,
  listCategories,
  initStock,
  getSubscriptionUsage,
} from "@/api";
import type { StockLevelResponse } from "@/api";

type Product = {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  stock: number;
  minStock: number;
  categoryId: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "green",
  Boissons: "blue",
  Hygiène: "purple",
  Divers: "default",
};

function stockStatus(stock: number, minStock: number): "ok" | "low" | "critical" {
  if (stock <= 0) return "critical";
  if (stock <= minStock) return "low";
  return "ok";
}

export default function Products() {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "ok">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockForm] = Form.useForm();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [productsAtLimit, setProductsAtLimit] = useState(false);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) => setProductsAtLimit(u.productsLimit > 0 && u.productsCount >= u.productsLimit))
      .catch(() => setProductsAtLimit(false));
  }, [products.length]);

  const fetchData = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [productsRes, categoriesRes, stockList] = await Promise.all([
        listProducts({ page: 0, size: 200, search: search || undefined }),
        listCategories(),
        activeStore?.id ? getStockByStore(activeStore.id) : Promise.resolve([]),
      ]);
      setCategories(categoriesRes.map((c) => ({ id: c.id, name: c.name })));
      const catById = Object.fromEntries(categoriesRes.map((c) => [c.id, c.name]));
      const stockByProduct: Record<string, StockLevelResponse> = {};
      for (const s of stockList) {
        stockByProduct[s.productId] = s;
      }
      setProducts(
        productsRes.content.map((p) => {
          const s = stockByProduct[p.id];
          return {
            id: p.id,
            name: p.name,
            category: (p.categoryId && catById[p.categoryId]) || "-",
            salePrice: p.salePrice,
            stock: s?.quantity ?? 0,
            minStock: s?.minStock ?? 0,
            categoryId: p.categoryId,
          };
        })
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeStore?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const status = stockStatus(p.stock, p.minStock);
    const matchStock =
      filterStock === "all" ||
      (filterStock === "low" && (status === "low" || status === "critical")) ||
      (filterStock === "ok" && status === "ok");
    return matchSearch && matchStock;
  });

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    form.setFieldsValue({
      name: p.name,
      categoryId: p.categoryId || undefined,
      costPrice: 0,
      salePrice: p.salePrice,
      initialStock: p.stock,
      minStockAlert: p.minStock,
    });
    setModalOpen(true);
  };
  const onSave = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editing) {
          await updateProduct(editing.id, {
            name: values.name,
            categoryId: values.categoryId || null,
            costPrice: values.costPrice ?? 0,
            salePrice: values.salePrice,
            isActive: true,
          });
          message.success("Produit mis à jour");
        } else {
          const created = await createProduct({
            name: values.name,
            categoryId: values.categoryId || null,
            costPrice: values.costPrice ?? 0,
            salePrice: values.salePrice,
            isActive: true,
          });
          if (activeStore?.id && values.initialStock != null && values.initialStock > 0) {
            await initStock({
              productId: created.id,
              storeId: activeStore.id,
              quantity: values.initialStock,
              minStock: values.minStockAlert ?? 0,
            });
          }
          message.success("Produit ajouté");
        }
        setModalOpen(false);
        form.resetFields();
        fetchData();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const openStockAdjust = (p: Product) => {
    setStockProduct(p);
    stockForm.setFieldsValue({
      newStock: p.stock,
      reason: "Ajustement manuel",
    });
    setStockModalOpen(true);
  };
  const onStockSave = () => {
    stockForm.validateFields().then(async (values) => {
      if (!stockProduct || !activeStore?.id) return;
      try {
        await adjustStock({
          productId: stockProduct.id,
          storeId: activeStore.id,
          quantity: values.newStock,
          type: "adjustment",
          note: values.reason || "Ajustement manuel",
        });
        message.success("Stock mis à jour");
        setStockModalOpen(false);
        setStockProduct(null);
        stockForm.resetFields();
        fetchData();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 120, height: 28 }} />
          <div className={styles.toolbar}>
            <Skeleton.Input active style={{ width: 260, height: 44 }} />
            <Skeleton.Button active style={{ width: 160, height: 44 }} />
          </div>
        </div>
        <Card bordered={false} className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <Typography.Title level={4} className="pageTitle">
          Produits
        </Typography.Title>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <Input
              prefix={<Search size={18} />}
              placeholder={t.products.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              className={styles.searchInput}
            />
            <Select
              value={filterStock}
              onChange={setFilterStock}
              options={[
                { value: "all", label: "Tous" },
                { value: "low", label: t.products.lowStock },
                { value: "ok", label: "Stock OK" },
              ]}
              className={styles.filterSelect}
            />
          </div>
          {productsAtLimit ? (
            <Typography.Text type="secondary">
              Limite atteinte. <Link to="/settings/subscription">Passer à un plan supérieur</Link>
            </Typography.Text>
          ) : (
            <Button type="primary" icon={<Plus size={18} />} onClick={openAdd}>
              {t.products.addProduct}
            </Button>
          )}
        </div>
      </header>

      <Card bordered={false} className={`${styles.card} contentCard`}>
        {filtered.length === 0 && search === "" && filterStock === "all" ? (
          <div className={styles.emptyHero}>
            <div className={styles.emptyIconWrap}>
              <Package size={36} strokeWidth={1.5} />
            </div>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              Aucun produit
            </Typography.Title>
            <Typography.Text
              type="secondary"
              style={{ maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}
            >
              Ajoutez votre premier produit pour commencer à vendre. Gérez les prix, le stock et les
              catégories.
            </Typography.Text>
            {!productsAtLimit && (
              <Button
                type="primary"
                size="large"
                icon={<Plus size={16} />}
                onClick={openAdd}
                style={{ marginTop: 20, height: 48 }}
              >
                Ajouter mon premier produit
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
                onClick: () => navigate(`/products/${r.id}`),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/products/${r.id}`);
                  }
                },
              })}
              className="dataTable"
              locale={{ emptyText: "Aucun produit trouvé" }}
              columns={[
                { title: t.common.name, dataIndex: "name" },
                {
                  title: t.products.category,
                  dataIndex: "category",
                  width: 140,
                  render: (cat: string) => (
                    <Tag color={CATEGORY_COLORS[cat] || "default"}>{cat}</Tag>
                  ),
                },
                {
                  title: "Prix",
                  dataIndex: "salePrice",
                  width: 100,
                  sorter: (a: Product, b: Product) => a.salePrice - b.salePrice,
                  render: (v: number) => (
                    <span className="amount">{v.toLocaleString("fr-FR")} F</span>
                  ),
                },
                {
                  title: "Stock",
                  dataIndex: "stock",
                  width: 100,
                  sorter: (a: Product, b: Product) => a.stock - b.stock,
                  render: (stock: number, r: Product) => {
                    const status = stockStatus(stock, r.minStock);
                    const color =
                      status === "critical" ? "error" : status === "low" ? "warning" : "success";
                    return <Tag color={color}>{stock}</Tag>;
                  },
                },
                {
                  title: "",
                  width: 140,
                  render: (_, r) => (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="text"
                        size="small"
                        icon={<Package size={14} />}
                        onClick={() => openStockAdjust(r)}
                        aria-label={t.products.stockAdjustment}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<Pencil size={14} />}
                        onClick={() => openEdit(r)}
                        aria-label={t.common.edit}
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<Trash2 size={14} />}
                        onClick={() => {
                          if (window.confirm(t.common.delete + " ?")) {
                            deleteProduct(r.id)
                              .then(() => {
                                message.success("Produit supprimé");
                                fetchData();
                              })
                              .catch((e) =>
                                message.error(e instanceof Error ? e.message : "Erreur")
                              );
                          }
                        }}
                        aria-label={t.common.delete}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Modal
        title={editing ? t.products.editProduct : t.products.addProduct}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText={t.products.save}
        width={440}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder="Nom du produit" />
          </Form.Item>
          <Form.Item name="categoryId" label={t.products.category}>
            <Select
              placeholder={t.products.category}
              allowClear
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item
            name="costPrice"
            label={t.products.purchasePrice}
            rules={[{ type: "number", min: 0, message: t.validation.numberMin }]}
          >
            <InputNumber min={0} addonAfter="F" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="salePrice"
            label={t.products.salePrice}
            rules={[
              { required: true, message: t.validation.requiredField },
              { type: "number", min: 0, message: t.validation.numberMin },
            ]}
          >
            <InputNumber min={0} addonAfter="F" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="initialStock"
            label={t.products.initialStock}
            rules={[{ type: "number", min: 0, message: t.validation.numberMin }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="minStockAlert"
            label={t.products.minStockAlert}
            rules={[{ type: "number", min: 0, message: t.validation.numberMin }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.products.stockAdjustment}
        open={stockModalOpen}
        onOk={onStockSave}
        onCancel={() => {
          setStockModalOpen(false);
          setStockProduct(null);
        }}
        okText={t.products.save}
        width={400}
        destroyOnClose
      >
        {stockProduct && (
          <Form form={stockForm} layout="vertical" style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">{stockProduct.name}</Typography.Text>
            <Typography.Text strong style={{ display: "block", marginBottom: 16 }}>
              Stock actuel : {stockProduct.stock}
            </Typography.Text>
            <Form.Item
              name="newStock"
              label={t.products.newStock}
              rules={[
                { required: true, message: t.validation.requiredField },
                { type: "number", min: 0, message: t.validation.numberMin },
              ]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="reason" label={t.products.reason}>
              <Input placeholder={t.products.reason} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
