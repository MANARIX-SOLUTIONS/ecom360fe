import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Typography,
  Table,
  Tag,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  message,
  Skeleton,
} from "antd";
import { ArrowLeft, Package, Pencil, Trash2, Layers } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Products.module.css";
import { getProduct, updateProduct, deleteProduct, listCategories, ApiError } from "@/api";
import { getStockLevel, adjustStock, getStockMovements } from "@/api";
import { useStore } from "@/contexts/StoreContext";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import type { ProductResponse } from "@/api";
import type { StockLevelResponse, StockMovementResponse } from "@/api";

function stockStatus(stock: number, minStock: number): "ok" | "low" | "critical" {
  if (stock <= 0) return "critical";
  if (stock <= minStock) return "low";
  return "ok";
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeStore, stores } = useStore();
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevelResponse[]>([]);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [stockForm] = Form.useForm();

  const fetchProduct = useCallback(async () => {
    if (!id || !localStorage.getItem("ecom360_access_token")) return;
    setLoading(true);
    try {
      const [productRes, categoriesRes] = await Promise.all([getProduct(id), listCategories()]);
      setProduct(productRes);
      setCategories(categoriesRes.map((c) => ({ id: c.id, name: c.name })));
      editForm.setFieldsValue({
        name: productRes.name,
        categoryId: productRes.categoryId || undefined,
        costPrice: productRes.costPrice ?? 0,
        salePrice: productRes.salePrice,
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
      } else {
        message.error(e instanceof Error ? e.message : "Erreur chargement");
        setProduct(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id, editForm]);

  const fetchStock = useCallback(async () => {
    if (!id || stores.length === 0) return;
    try {
      const levels: StockLevelResponse[] = [];
      for (const store of stores) {
        try {
          const level = await getStockLevel(id, store.id);
          levels.push(level);
        } catch {
          levels.push({
            id: "",
            productId: id,
            productName: "",
            storeId: store.id,
            storeName: store.name,
            quantity: 0,
            minStock: 0,
            lowStock: false,
            updatedAt: "",
          });
        }
      }
      setStockLevels(levels);
    } catch {
      setStockLevels([]);
    }
  }, [id, stores]);

  const fetchMovements = useCallback(async () => {
    if (!id || !activeStore?.id) return;
    try {
      const res = await getStockMovements(id, activeStore.id, {
        page: 0,
        size: 20,
      });
      setMovements(res.content || []);
    } catch {
      setMovements([]);
    }
  }, [id, activeStore?.id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (product) {
      fetchStock();
      fetchMovements();
    }
  }, [product, fetchStock, fetchMovements]);

  if (!id) return <Navigate to="/products" replace />;

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.backWrap}>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
        <Card bordered={false} className={styles.heroCard}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      </div>
    );
  }

  if (notFound)
    return (
      <ResourceNotFound resource="Produit" backPath="/products" backLabel="Retour aux produits" />
    );
  if (!product) return <Navigate to="/products" replace />;

  const categoryName =
    product.categoryId && categories.find((c) => c.id === product.categoryId)?.name;
  const activeStock = stockLevels.find((s) => s.storeId === activeStore?.id);

  const handleEdit = () => {
    editForm.validateFields().then(async (values) => {
      try {
        await updateProduct(id, {
          name: values.name,
          categoryId: values.categoryId || null,
          costPrice: values.costPrice ?? 0,
          salePrice: values.salePrice,
        });
        message.success("Produit mis à jour");
        setEditOpen(false);
        fetchProduct();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm(t.common.delete + " ?")) return;
    deleteProduct(id)
      .then(() => {
        message.success("Produit supprimé");
        navigate("/products");
      })
      .catch((e) => message.error(e instanceof Error ? e.message : "Erreur"));
  };

  const handleStockSave = () => {
    if (!activeStore?.id) return;
    stockForm.validateFields().then(async (values) => {
      try {
        await adjustStock({
          productId: id,
          storeId: activeStore.id,
          quantity: values.newStock,
          type: "adjustment",
          note: values.reason || "Ajustement manuel",
        });
        message.success("Stock mis à jour");
        setStockOpen(false);
        fetchStock();
        fetchMovements();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const openStockModal = () => {
    stockForm.setFieldsValue({
      newStock: activeStock?.quantity ?? 0,
      reason: "Ajustement manuel",
    });
    setStockOpen(true);
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      <div className={styles.backWrap}>
        <Button type="text" icon={<ArrowLeft size={18} />} onClick={() => navigate("/products")}>
          {t.common.back}
        </Button>
      </div>

      <Card bordered={false} className={styles.heroCard}>
        <div className={styles.heroInner}>
          <div className={styles.emptyIconWrap} style={{ width: 56, height: 56 }}>
            <Package size={28} />
          </div>
          <div className={styles.heroInfo}>
            <Typography.Title level={4} className={styles.heroName}>
              {product.name}
            </Typography.Title>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
              {categoryName && <Tag color="blue">{categoryName}</Tag>}
              {product.sku && (
                <Typography.Text type="secondary">SKU: {product.sku}</Typography.Text>
              )}
              {product.barcode && (
                <Typography.Text type="secondary">Code: {product.barcode}</Typography.Text>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 140,
            }}
          >
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t.products.salePrice}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: "2px 0 0" }}>
                {product.salePrice.toLocaleString("fr-FR")} F
              </Typography.Title>
            </div>
            {activeStock && (
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Stock ({activeStore?.name})
                </Typography.Text>
                <Tag
                  color={
                    stockStatus(activeStock.quantity, activeStock.minStock) === "critical"
                      ? "error"
                      : stockStatus(activeStock.quantity, activeStock.minStock) === "low"
                        ? "warning"
                        : "success"
                  }
                >
                  {activeStock.quantity}
                </Tag>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              icon={<Layers size={18} />}
              onClick={openStockModal}
              disabled={!activeStore?.id}
            >
              {t.products.stockAdjustment}
            </Button>
            <Button icon={<Pencil size={18} />} onClick={() => setEditOpen(true)}>
              {t.common.edit}
            </Button>
            <Button danger icon={<Trash2 size={18} />} onClick={handleDelete}>
              {t.common.delete}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={t.products.details}
        bordered={false}
        className={`${styles.card} ${styles.sectionCard} contentCard`}
      >
        <div
          className={styles.infoGrid}
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        >
          <div>
            <div className={styles.infoLabel}>{t.common.name}</div>
            <div className={styles.infoValue}>{product.name}</div>
          </div>
          {categoryName && (
            <div>
              <div className={styles.infoLabel}>{t.products.category}</div>
              <div className={styles.infoValue}>{categoryName}</div>
            </div>
          )}
          <div>
            <div className={styles.infoLabel}>{t.products.purchasePrice}</div>
            <div className={styles.infoValue}>{product.costPrice.toLocaleString("fr-FR")} F</div>
          </div>
          <div>
            <div className={styles.infoLabel}>{t.products.salePrice}</div>
            <div className={styles.infoValue}>{product.salePrice.toLocaleString("fr-FR")} F</div>
          </div>
          <div>
            <div className={styles.infoLabel}>Unité</div>
            <div className={styles.infoValue}>{product.unit || "pièce"}</div>
          </div>
          {product.description && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className={styles.infoLabel}>Description</div>
              <div className={styles.infoValue}>{product.description}</div>
            </div>
          )}
        </div>
      </Card>

      <Card
        title={t.products.stockByStore}
        bordered={false}
        className={`${styles.card} ${styles.sectionCard} contentCard`}
      >
        {stockLevels.length === 0 ? (
          <Typography.Text type="secondary">Aucun stock configuré</Typography.Text>
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={stockLevels}
              rowKey="storeId"
              pagination={false}
              size="small"
              className="dataTable"
              columns={[
                { title: "Boutique", dataIndex: "storeName" },
                {
                  title: "Quantité",
                  dataIndex: "quantity",
                  render: (v: number, r: StockLevelResponse) => (
                    <Tag
                      color={
                        stockStatus(v, r.minStock) === "critical"
                          ? "error"
                          : stockStatus(v, r.minStock) === "low"
                            ? "warning"
                            : "success"
                      }
                    >
                      {v}
                    </Tag>
                  ),
                },
                {
                  title: t.products.minStockAlert,
                  dataIndex: "minStock",
                },
              ]}
            />
          </div>
        )}
      </Card>

      {activeStore?.id && (
        <Card
          title={t.products.movements}
          bordered={false}
          className={`${styles.card} contentCard`}
        >
          {movements.length === 0 ? (
            <Typography.Text type="secondary">Aucun mouvement</Typography.Text>
          ) : (
            <div className="tableResponsive">
              <Table
                dataSource={movements}
                rowKey="id"
                pagination={false}
                size="small"
                className="dataTable"
                columns={[
                  {
                    title: t.common.date,
                    dataIndex: "createdAt",
                    render: (v: string) => v?.split("T")[0] ?? "-",
                  },
                  { title: "Type", dataIndex: "type" },
                  {
                    title: "Qté",
                    dataIndex: "quantity",
                    render: (v: number, r: StockMovementResponse) => (
                      <span
                        style={{
                          color:
                            r.type === "in" || r.type === "adjustment"
                              ? "var(--color-success)"
                              : "var(--color-danger)",
                        }}
                      >
                        {r.type === "in" ? "+" : r.type === "out" ? "-" : ""}
                        {v}
                      </span>
                    ),
                  },
                  {
                    title: "Avant → Après",
                    render: (_, r: StockMovementResponse) =>
                      `${r.quantityBefore} → ${r.quantityAfter}`,
                  },
                  { title: "Note", dataIndex: "note" },
                ]}
              />
            </div>
          )}
        </Card>
      )}

      <Modal
        title={t.products.editProduct}
        open={editOpen}
        onOk={handleEdit}
        onCancel={() => setEditOpen(false)}
        okText={t.products.save}
        width={440}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
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
        </Form>
      </Modal>

      <Modal
        title={t.products.stockAdjustment}
        open={stockOpen}
        onOk={handleStockSave}
        onCancel={() => setStockOpen(false)}
        okText={t.products.save}
        width={400}
      >
        <Form form={stockForm} layout="vertical" style={{ marginTop: 16 }}>
          <Typography.Text type="secondary">{product.name}</Typography.Text>
          <Typography.Text strong style={{ display: "block", marginBottom: 16 }}>
            Stock actuel : {activeStock?.quantity ?? 0}
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
      </Modal>
    </div>
  );
}
