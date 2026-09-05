import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Input,
  Button,
  Tag,
  Modal,
  Form,
  InputNumber,
  Select,
  Typography,
  Skeleton,
  message,
  Drawer,
  Space,
  Upload,
  Tooltip,
  Pagination,
} from "antd";
import { CurrencyInput } from "@/components/CurrencyInput";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Pencil, Package, Trash2, Tags, Upload as UploadIcon } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Products.module.css";
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImageFile,
  adjustStock,
  listCategoriesWithDefaults,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  initStock,
  getSubscriptionUsage,
  getStockForProducts,
} from "@/api";
import type { StockLevelResponse, CategoryResponse } from "@/api";
import { sanitizeExternalImageUrl } from "@/utils/sanitizeImageUrl";
import type { UploadFile } from "antd/es/upload/interface";

const CATEGORY_COLOR_OPTIONS = [
  { value: "blue", label: "Bleu" },
  { value: "green", label: "Vert" },
  { value: "orange", label: "Orange" },
  { value: "purple", label: "Violet" },
  { value: "red", label: "Rouge" },
  { value: "cyan", label: "Cyan" },
  { value: "default", label: "Gris" },
];

type Product = {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  minStock: number;
  categoryId: string | null;
  storeId: string;
  imageUrl: string | null;
};

type StockFilter = "all" | "low" | "ok" | "out";
type StockStatus = "ok" | "low" | "critical";

const STOCK_CHIPS: { id: StockFilter; label: string }[] = [
  { id: "all", label: t.products.filterAll },
  { id: "low", label: t.products.lowStock },
  { id: "out", label: t.products.filterStockOut },
  { id: "ok", label: t.products.filterStockOk },
];

function stockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return "critical";
  if (stock <= minStock) return "low";
  return "ok";
}

function formatAmount(n: number) {
  return `${n.toLocaleString("fr-FR")} F`;
}

function productsCountLabel(count: number) {
  if (count === 1) return t.products.countOne;
  return t.products.countOther.replace("{count}", String(count));
}

function matchesStockFilter(status: StockStatus, filter: StockFilter) {
  if (filter === "all") return true;
  if (filter === "out") return status === "critical";
  if (filter === "low") return status === "low";
  return status === "ok";
}

function ProductThumb({ imageUrl }: { imageUrl: string | null }) {
  const src = sanitizeExternalImageUrl(imageUrl);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        className={styles.tableThumb}
      />
    );
  }
  return (
    <span className={styles.tableThumbFallback}>
      <Package size={16} />
    </span>
  );
}

type ProductRowProps = {
  product: Product;
  canAdjust: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onOpen: (product: Product) => void;
  onAdjust: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

function ProductRow({
  product,
  canAdjust,
  canUpdate,
  canDelete,
  onOpen,
  onAdjust,
  onEdit,
  onDelete,
}: ProductRowProps) {
  const status = stockStatus(product.stock, product.minStock);
  const categoryLabel = product.category || t.products.noCategory;
  const pillLabel =
    status === "critical"
      ? t.products.stockOut
      : status === "low"
        ? `${t.products.lowStock} · ${product.stock}`
        : `${t.products.stockOk} · ${product.stock}`;
  const rowTone = status === "critical" ? styles.rowOut : status === "low" ? styles.rowLow : "";

  return (
    <li className={`${styles.row} ${rowTone}`}>
      <button
        type="button"
        className={styles.identity}
        onClick={() => onOpen(product)}
        aria-label={t.products.openProductAria.replace("{name}", product.name)}
      >
        <ProductThumb imageUrl={product.imageUrl} />
        <span className={styles.identityText}>
          <span className={styles.name}>{product.name}</span>
          <span className={styles.meta}>{categoryLabel}</span>
        </span>
      </button>

      <span className={styles.price}>{formatAmount(product.salePrice)}</span>

      <div className={styles.stockCol}>
        <span
          className={`${styles.pill} ${
            status === "critical"
              ? styles.pillOut
              : status === "low"
                ? styles.pillLow
                : styles.pillOk
          }`}
        >
          {pillLabel}
        </span>
        {product.minStock > 0 ? (
          <span className={styles.stockHint}>
            {t.products.minStockHint.replace("{n}", String(product.minStock))}
          </span>
        ) : null}
      </div>

      <div className={styles.actions}>
        {canAdjust ? (
          <Tooltip title={t.products.stockAdjustment}>
            <Button
              type="text"
              size="small"
              aria-label={t.products.stockAdjustment}
              icon={<Package size={16} />}
              onClick={() => onAdjust(product)}
            />
          </Tooltip>
        ) : null}
        {canUpdate ? (
          <Tooltip title={t.common.edit}>
            <Button
              type="text"
              size="small"
              aria-label={t.common.edit}
              icon={<Pencil size={16} />}
              onClick={() => onEdit(product)}
            />
          </Tooltip>
        ) : null}
        {canDelete ? (
          <Tooltip title={t.common.delete}>
            <Button
              type="text"
              size="small"
              danger
              aria-label={t.common.delete}
              icon={<Trash2 size={16} />}
              onClick={() => onDelete(product)}
            />
          </Tooltip>
        ) : null}
      </div>
    </li>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const { matrixCan } = useMatrixCan();
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState<StockFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockForm] = Form.useForm();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [productsAtLimit, setProductsAtLimit] = useState(false);
  const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [categoryForm] = Form.useForm();
  const hasLoadedOnce = useRef(false);
  /** Pending file chosen in the product modal (upload after create/update). */
  const [imageFile, setImageFile] = useState<File | null>(null);
  /** True when user removed the existing image without picking a new file. */
  const [imageRemoved, setImageRemoved] = useState(false);
  const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);

  // Debounce search to avoid refetch on every keystroke (stops flicker)
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page + "initial load" when store / search changes
  useEffect(() => {
    hasLoadedOnce.current = false;
    setPage(0);
  }, [activeStore?.id]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) => setProductsAtLimit(u.productsLimit > 0 && u.productsCount >= u.productsLimit))
      .catch(() => setProductsAtLimit(false));
  }, [products.length]);

  const fetchCategories = useCallback(async () => {
    try {
      return await listCategoriesWithDefaults();
    } catch {
      return [];
    }
  }, []);

  const fetchData = useCallback(
    async (silent = false, searchOverride?: string, isCancelled?: () => boolean) => {
      if (!localStorage.getItem("ecom360_access_token")) {
        if (!silent && !isCancelled?.()) setLoading(false);
        return;
      }
      const isInitialLoad = !hasLoadedOnce.current;
      if (!silent && isInitialLoad && !isCancelled?.()) setLoading(true);
      const searchToUse = searchOverride !== undefined ? searchOverride : debouncedSearch;
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          listProducts({
            page,
            size: pageSize,
            search: searchToUse || undefined,
            storeId: activeStore?.id,
          }),
          fetchCategories(),
        ]);
        if (isCancelled?.()) return;
        setCategories(categoriesRes);
        const catById = Object.fromEntries(
          categoriesRes.map((c) => [c.id, { name: c.name, color: c.color }])
        );
        const productIds = productsRes.content.map((p) => p.id);
        const stockList =
          activeStore?.id && productIds.length > 0
            ? await getStockForProducts(activeStore.id, productIds)
            : [];
        if (isCancelled?.()) return;
        const stockByProduct: Record<string, StockLevelResponse> = {};
        for (const s of stockList) {
          stockByProduct[s.productId] = s;
        }
        setTotal(productsRes.totalElements ?? 0);
        setProducts(
          productsRes.content.map((p) => {
            const s = stockByProduct[p.id];
            const cat = p.categoryId ? catById[p.categoryId] : null;
            return {
              id: p.id,
              storeId: p.storeId,
              name: p.name,
              category: cat?.name || "",
              salePrice: p.salePrice,
              costPrice: p.costPrice,
              stock: s?.quantity ?? 0,
              minStock: s?.minStock ?? 0,
              categoryId: p.categoryId,
              imageUrl: p.imageUrl,
            };
          })
        );
        hasLoadedOnce.current = true;
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setProducts([]);
        setTotal(0);
      } finally {
        if (!silent && isInitialLoad && !isCancelled?.()) setLoading(false);
      }
    },
    [debouncedSearch, activeStore?.id, fetchCategories, page, pageSize]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchData(false, undefined, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const pageStats = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const product of products) {
      const status = stockStatus(product.stock, product.minStock);
      if (status === "critical") out += 1;
      else if (status === "low") low += 1;
    }
    return { low, out, alerts: low + out };
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter((product) =>
        matchesStockFilter(stockStatus(product.stock, product.minStock), filterStock)
      ),
    [products, filterStock]
  );

  const hasActiveFilters = search !== "" || filterStock !== "all";
  const followUpLabel =
    pageStats.alerts === 1
      ? t.products.lowFollowUpOne
      : t.products.lowFollowUpOther.replace("{count}", String(pageStats.alerts));

  const resetFilters = () => {
    setSearch("");
    setFilterStock("all");
  };

  const resetImageState = () => {
    setImageFile(null);
    setImageRemoved(false);
    setImageFileList([]);
  };

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    resetImageState();
    setModalOpen(true);
  };
  const openCategoryDrawer = () => {
    setCategoriesDrawerOpen(true);
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    setCategoryModalOpen(true);
  };

  const openEditCategory = (c: CategoryResponse) => {
    setEditingCategory(c);
    categoryForm.setFieldsValue({
      name: c.name,
      color: c.color || "default",
      sortOrder: c.sortOrder ?? 0,
    });
    setCategoryModalOpen(true);
  };

  const onCategorySave = () => {
    categoryForm.validateFields().then(async (values) => {
      try {
        let createdId: string | null = null;
        if (editingCategory) {
          await updateCategory(editingCategory.id, {
            name: values.name,
            color: values.color,
            sortOrder: values.sortOrder ?? 0,
          });
          message.success(t.common.categoryUpdated);
        } else {
          const created = await createCategory({
            name: values.name,
            color: values.color,
            sortOrder: values.sortOrder ?? 0,
          });
          createdId = created.id;
          message.success(t.common.categoryAdded);
        }
        setCategoryModalOpen(false);
        categoryForm.resetFields();
        const refreshed = await listCategories();
        setCategories(refreshed);
        if (createdId && modalOpen) {
          form.setFieldValue("categoryId", createdId);
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
      }
    });
  };

  const onCategoryDelete = (c: CategoryResponse) => {
    Modal.confirm({
      title: t.common.delete,
      content: t.products.deleteCategoryConfirm.replace("{name}", c.name),
      okText: t.products.deleteProductOk,
      okType: "danger",
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteCategory(c.id);
          message.success(t.common.categoryDeleted);
          const refreshed = await listCategories();
          setCategories(refreshed);
          fetchData(true, "");
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        }
      },
    });
  };

  const onProductDelete = (product: Product) => {
    Modal.confirm({
      title: t.common.delete,
      content: t.products.deleteProductConfirm.replace("{name}", product.name),
      okText: t.products.deleteProductOk,
      okType: "danger",
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteProduct(product.id);
          message.success(t.products.msgDeleted);
          fetchData(true, "");
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        }
      },
    });
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    form.setFieldsValue({
      name: p.name,
      categoryId: p.categoryId || undefined,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      initialStock: p.stock,
      minStockAlert: p.minStock,
    });
    setImageFile(null);
    setImageRemoved(false);
    const src = sanitizeExternalImageUrl(p.imageUrl);
    if (src) {
      setImageFileList([
        {
          uid: "-existing",
          name: "image",
          status: "done",
          url: src,
        },
      ]);
    } else {
      setImageFileList([]);
    }
    setModalOpen(true);
  };

  const onSave = () => {
    form.validateFields().then(async (values) => {
      try {
        if (!activeStore?.id) {
          message.warning(t.products.warnSelectStoreForProducts);
          return;
        }
        let productId: string;
        if (editing) {
          // Always send imageUrl on update so BE does not clear it.
          // null = user removed image; keep existing URL otherwise (upload replaces after).
          const imageUrlForUpdate: string | null = imageRemoved ? null : (editing.imageUrl ?? null);
          await updateProduct(editing.id, {
            name: values.name,
            categoryId: values.categoryId || null,
            costPrice: values.costPrice,
            salePrice: values.salePrice,
            isActive: true,
            storeId: activeStore.id,
            imageUrl: imageUrlForUpdate,
          });
          productId = editing.id;
          message.success(t.products.msgUpdated);
        } else {
          const created = await createProduct({
            name: values.name,
            categoryId: values.categoryId || null,
            costPrice: values.costPrice,
            salePrice: values.salePrice,
            isActive: true,
            storeId: activeStore.id,
          });
          productId = created.id;
          if (values.initialStock != null && values.initialStock > 0) {
            await initStock({
              productId: created.id,
              storeId: activeStore.id,
              quantity: values.initialStock,
              minStock: values.minStockAlert ?? 0,
            });
          }
          message.success(t.products.msgAdded);
        }
        if (imageFile) {
          try {
            await uploadProductImageFile(productId, imageFile);
          } catch (e) {
            message.error(e instanceof Error ? e.message : t.products.imageUploadError);
          }
        }
        setModalOpen(false);
        form.resetFields();
        resetImageState();
        fetchData(true, "");
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
      }
    });
  };

  const openStockAdjust = (p: Product) => {
    setStockProduct(p);
    stockForm.setFieldsValue({
      newStock: p.stock,
      reason: t.products.manualAdjustmentReason,
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
          note: values.reason || t.products.manualAdjustmentReason,
        });
        message.success(t.products.msgStockUpdated);
        setStockModalOpen(false);
        setStockProduct(null);
        stockForm.resetFields();
        fetchData(true, "");
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
      }
    });
  };

  const canManageCategories =
    matrixCan("CATEGORIES_CREATE", "products") ||
    matrixCan("CATEGORIES_UPDATE", "products") ||
    matrixCan("CATEGORIES_DELETE", "products");
  const canCreateProducts = matrixCan("PRODUCTS_CREATE", "products");
  const canAdjustStock = matrixCan("STOCK_ADJUST", "products");
  const canUpdateProducts = matrixCan("PRODUCTS_UPDATE", "products");
  const canDeleteProducts = matrixCan("PRODUCTS_DELETE", "products");
  const isCatalogEmpty = products.length === 0 && search === "" && filterStock === "all";

  if (loading && products.length === 0 && !hasActiveFilters) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 140, height: 32 }} />
          <Skeleton.Button active style={{ width: 160, height: 40 }} />
        </div>
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <Typography.Title level={4} className="pageTitle">
            {t.products.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="pageSubtitle">
            {productsCountLabel(total)}
          </Typography.Text>
        </div>
        <div className={styles.headerActions}>
          {canManageCategories ? (
            <Button icon={<Tags size={16} />} onClick={openCategoryDrawer}>
              {t.products.manageCategories}
            </Button>
          ) : null}
          {productsAtLimit ? (
            <Typography.Text type="secondary">
              {t.products.limitReached}{" "}
              <Link to="/settings/subscription">{t.products.upgradePlan}</Link>
            </Typography.Text>
          ) : canCreateProducts ? (
            <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>
              {t.products.addProduct}
            </Button>
          ) : null}
        </div>
      </header>

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        {isCatalogEmpty ? null : (
          <div className={styles.toolbar}>
            <div className={styles.chips} role="group" aria-label={t.products.filterByStock}>
              {STOCK_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={filterStock === chip.id}
                  className={`${styles.chip} ${filterStock === chip.id ? styles.chipActive : ""}`}
                  onClick={() => setFilterStock(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <Input
              prefix={<Search size={16} />}
              placeholder={t.products.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              className={styles.searchInput}
            />
            {hasActiveFilters ? (
              <Button onClick={resetFilters}>{t.products.resetFilters}</Button>
            ) : null}
          </div>
        )}

        {isCatalogEmpty ? (
          <EmptyState
            icon={Package}
            title={t.products.emptyTitle}
            description={t.products.emptyDesc}
            action={
              !productsAtLimit && canCreateProducts ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<Plus size={16} />}
                  onClick={openAdd}
                  style={{ height: 48 }}
                >
                  {t.products.emptyCta}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {products.length > 0 ? (
              <>
                <div className={styles.stats} aria-label={t.products.summaryPageHint}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{productsCountLabel(products.length)}</span>
                    <span className={styles.statLabel}>{t.products.summaryPageHint}</span>
                  </div>
                  <div className={`${styles.stat} ${pageStats.low > 0 ? styles.statWarn : ""}`}>
                    <span className={styles.statValue}>{pageStats.low}</span>
                    <span className={styles.statLabel}>{t.products.summaryLow}</span>
                  </div>
                  <div className={`${styles.stat} ${pageStats.out > 0 ? styles.statDanger : ""}`}>
                    <span className={styles.statValue}>{pageStats.out}</span>
                    <span className={styles.statLabel}>{t.products.summaryOut}</span>
                  </div>
                </div>
                {pageStats.alerts > 0 && filterStock === "all" ? (
                  <div className={styles.followUp}>{followUpLabel}</div>
                ) : null}
              </>
            ) : null}
            {filtered.length === 0 ? (
              <EmptyState
                icon={Package}
                title={t.products.emptyFilteredTitle}
                description={t.products.emptyFilteredDesc}
                action={
                  <Button size="large" onClick={resetFilters}>
                    {t.products.resetFilters}
                  </Button>
                }
              />
            ) : (
              <ul className={styles.list} aria-busy={loading}>
                {filtered.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    canAdjust={canAdjustStock}
                    canUpdate={canUpdateProducts}
                    canDelete={canDeleteProducts}
                    onOpen={(next) => navigate(`/products/${next.id}`)}
                    onAdjust={openStockAdjust}
                    onEdit={openEdit}
                    onDelete={onProductDelete}
                  />
                ))}
              </ul>
            )}
            {total > pageSize ? (
              <div className={styles.pager}>
                <Pagination
                  current={page + 1}
                  pageSize={pageSize}
                  total={total}
                  showSizeChanger
                  pageSizeOptions={["10", "20", "50"]}
                  showTotal={(count) => productsCountLabel(count)}
                  onChange={(nextPage, size) => {
                    setPage(nextPage - 1);
                    setPageSize(size);
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Modal
        title={editing ? t.products.editProduct : t.products.addProduct}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => {
          setModalOpen(false);
          resetImageState();
        }}
        okText={t.products.save}
        width="min(440px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label={t.products.imageLabel}>
            <Upload
              accept="image/png,image/jpeg,image/webp,image/gif"
              listType="picture-card"
              maxCount={1}
              fileList={imageFileList}
              beforeUpload={(file) => {
                const isAllowed =
                  file.type === "image/png" ||
                  file.type === "image/jpeg" ||
                  file.type === "image/webp" ||
                  file.type === "image/gif";
                if (!isAllowed) {
                  message.error(t.products.imageFormats);
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 8 * 1024 * 1024) {
                  message.error(t.products.imageFormats);
                  return Upload.LIST_IGNORE;
                }
                const preview = URL.createObjectURL(file);
                setImageFile(file);
                setImageRemoved(false);
                setImageFileList([
                  {
                    uid: "-1",
                    name: file.name,
                    status: "done",
                    url: preview,
                  },
                ]);
                return false;
              }}
              onRemove={() => {
                setImageFile(null);
                setImageFileList([]);
                setImageRemoved(true);
                return true;
              }}
            >
              {imageFileList.length >= 1 ? null : (
                <div>
                  <UploadIcon size={18} />
                  <div style={{ marginTop: 8 }}>{t.products.imageUpload}</div>
                </div>
              )}
            </Upload>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t.products.imageFormats}
            </Typography.Text>
          </Form.Item>
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder={t.products.placeholderProductName} />
          </Form.Item>
          <Form.Item name="categoryId" label={t.products.category}>
            <Select
              placeholder={t.products.category}
              allowClear
              showSearch
              optionFilterProp="label"
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {matrixCan("CATEGORIES_CREATE", "products") && (
                    <div style={{ padding: "8px 12px", borderTop: "1px solid #f0f0f0" }}>
                      <Button
                        type="text"
                        block
                        icon={<Plus size={14} />}
                        onClick={() => {
                          setEditingCategory(null);
                          categoryForm.resetFields();
                          setCategoryModalOpen(true);
                        }}
                      >
                        {t.products.addCategory}
                      </Button>
                    </div>
                  )}
                </>
              )}
            />
          </Form.Item>
          <Form.Item
            name="costPrice"
            label={t.products.purchasePrice}
            rules={[{ type: "number", min: 0, message: t.validation.numberMin }]}
          >
            <CurrencyInput min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="salePrice"
            label={t.products.salePrice}
            rules={[
              { required: true, message: t.validation.requiredField },
              { type: "number", min: 0, message: t.validation.numberMin },
            ]}
          >
            <CurrencyInput min={0} style={{ width: "100%" }} />
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
        destroyOnHidden
      >
        {stockProduct && (
          <Form form={stockForm} layout="vertical" style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">{stockProduct.name}</Typography.Text>
            <Typography.Text strong style={{ display: "block", marginBottom: 16 }}>
              {t.products.currentStockValue.replace("{n}", String(stockProduct.stock))}
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

      <Drawer
        title={t.products.manageCategories}
        placement="right"
        width={400}
        onClose={() => setCategoriesDrawerOpen(false)}
        open={categoriesDrawerOpen}
        extra={
          matrixCan("CATEGORIES_CREATE", "products") ? (
            <Button type="primary" icon={<Plus size={16} />} onClick={openAddCategory}>
              {t.products.addCategory}
            </Button>
          ) : null
        }
      >
        {categories.length === 0 ? (
          <EmptyState
            compact
            icon={Tags}
            title={t.products.emptyCategoriesTitle}
            description={t.products.emptyCategoriesDesc}
          />
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {categories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--color-bg-secondary)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Tag color={c.color || "default"}>{c.name}</Tag>
                </div>
                <Space>
                  {matrixCan("CATEGORIES_UPDATE", "products") && (
                    <Button
                      type="text"
                      size="small"
                      icon={<Pencil size={14} />}
                      onClick={() => openEditCategory(c)}
                      aria-label={t.common.edit}
                    />
                  )}
                  {matrixCan("CATEGORIES_DELETE", "products") && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<Trash2 size={14} />}
                      onClick={() => onCategoryDelete(c)}
                      aria-label={t.common.delete}
                    />
                  )}
                </Space>
              </div>
            ))}
          </Space>
        )}
      </Drawer>

      <Modal
        title={editingCategory ? t.products.editCategory : t.products.addCategory}
        open={categoryModalOpen}
        onOk={onCategorySave}
        onCancel={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
          categoryForm.resetFields();
        }}
        okText={t.products.save}
        width={380}
        destroyOnHidden
      >
        <Form form={categoryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.products.categoryName}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder={t.products.placeholderCategoryExamples} />
          </Form.Item>
          <Form.Item name="color" label={t.products.categoryColor} initialValue="default">
            <Select options={CATEGORY_COLOR_OPTIONS} />
          </Form.Item>
          <Form.Item name="sortOrder" label={t.products.categorySortOrder} initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
