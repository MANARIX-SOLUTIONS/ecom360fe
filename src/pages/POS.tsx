import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
  Card,
  Input,
  Button,
  Typography,
  message,
  Badge,
  Select,
  Modal,
  Form,
  Spin,
  Result,
} from "antd";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Search, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { t } from "@/i18n";
import styles from "./POS.module.css";
import { useStore } from "@/hooks/useStore";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  getStockByStore,
  listClients,
  createSale,
  getSale,
  updateSale,
  getSubscriptionUsage,
  listCategories,
  createClient,
} from "@/api";
import type { SaleResponse } from "@/api";
import { WALK_IN_CLIENT_NAME, isWalkInClientName } from "@/utils/clientWalkIn";

type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

type PaymentMethod = "cash" | "wave" | "orange_money" | "credit";

type ProductForPOS = {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  minStock: number;
};

type ClientForPOS = {
  id: string;
  name: string;
  creditBalance: number;
  isWalkIn: boolean;
};

const PAYMENT_METHODS: {
  key: PaymentMethod;
  label: string;
  hint: string;
  image: string;
  color: string;
  bg: string;
}[] = [
  {
    key: "cash",
    label: t.pos.cash,
    hint: t.pos.paymentHintCash,
    image: "/images/payments/cash.svg",
    color: "var(--color-success)",
    bg: "rgba(46,204,113,0.12)",
  },
  {
    key: "wave",
    label: t.pos.wave,
    hint: t.pos.paymentHintWave,
    image: "/images/payments/wave.png",
    color: "#1BA3E8",
    bg: "rgba(27,163,232,0.12)",
  },
  {
    key: "orange_money",
    label: t.pos.orangeMoney,
    hint: t.pos.paymentHintOrange,
    image: "/images/payments/orange-money.png",
    color: "#F39C12",
    bg: "rgba(243,156,18,0.12)",
  },
  {
    key: "credit",
    label: t.pos.credit,
    hint: t.pos.paymentHintCredit,
    image: "/images/payments/credit.svg",
    color: "var(--color-primary)",
    bg: "rgba(31,58,95,0.12)",
  },
];

function stockLevel(stock: number, minStock: number): "ok" | "low" | "out" {
  if (stock <= 0) return "out";
  if (stock <= minStock) return "low";
  return "ok";
}

function categoryInitial(category: string): string {
  return category.charAt(0).toUpperCase();
}

const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "#2ecc71",
  Boissons: "#3498db",
  Hygiène: "#9b59b6",
  Divers: "#95a5a6",
};

/** Colonnes visibles environ × lignes sans scroll excessif avant « Voir plus » */
const PRODUCTS_PAGE_SIZE = {
  mobile: 12,
  tablet: 24,
  desktop: 40,
} as const;

function getPosBreakpoint(): keyof typeof PRODUCTS_PAGE_SIZE {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function usePosBreakpoint(): keyof typeof PRODUCTS_PAGE_SIZE {
  const [bp, setBp] = useState<keyof typeof PRODUCTS_PAGE_SIZE>(() => getPosBreakpoint());

  useEffect(() => {
    const mMobile = window.matchMedia("(max-width: 639px)");
    const mTablet = window.matchMedia("(min-width: 640px) and (max-width: 1023px)");
    function sync() {
      if (mMobile.matches) setBp("mobile");
      else if (mTablet.matches) setBp("tablet");
      else setBp("desktop");
    }
    mMobile.addEventListener("change", sync);
    mTablet.addEventListener("change", sync);
    sync();
    return () => {
      mMobile.removeEventListener("change", sync);
      mTablet.removeEventListener("change", sync);
    };
  }, []);

  return bp;
}

export default function POS() {
  const navigate = useNavigate();
  const { saleId: editSaleId } = useParams<{ saleId: string }>();
  const { activeStore, setActiveStoreId } = useStore();
  const { canMultiPayment, canClientCredits } = usePlanFeatures();
  useDocumentTitle(editSaleId ? t.pos.editSaleTitle : undefined);

  const paymentMethods = useMemo(
    () =>
      PAYMENT_METHODS.filter((m) => {
        if (m.key === "cash") return true;
        if (m.key === "wave" || m.key === "orange_money") return canMultiPayment;
        if (m.key === "credit") return canClientCredits;
        return false;
      }),
    [canMultiPayment, canClientCredits]
  );

  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");

  const posBreakpoint = usePosBreakpoint();
  const productPageSize = PRODUCTS_PAGE_SIZE[posBreakpoint];
  const [productVisibleLimit, setProductVisibleLimit] = useState<number>(
    () => PRODUCTS_PAGE_SIZE[getPosBreakpoint()]
  );

  useEffect(() => {
    setProductVisibleLimit(productPageSize);
  }, [category, search, productPageSize]);

  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductForPOS[]>([]);
  const [categories, setCategories] = useState<string[]>(["Tous"]);
  const [clients, setClients] = useState<ClientForPOS[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [salesAtLimit, setSalesAtLimit] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [quickClientForm] = Form.useForm<{ name: string; phone?: string }>();
  const searchRef = useRef<ReturnType<(typeof Input)["prototype"]["input"]>>(null);
  const [saleToEdit, setSaleToEdit] = useState<SaleResponse | null>(null);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);
  const [editHydrated, setEditHydrated] = useState(false);
  const prevHadEditRoute = useRef(false);

  useEffect(() => {
    if (editSaleId) return;
    getSubscriptionUsage()
      .then((u) => setSalesAtLimit(u.salesLimit > 0 && u.salesThisMonth >= u.salesLimit))
      .catch(() => setSalesAtLimit(false));
  }, [editSaleId]);

  useEffect(() => {
    if (editSaleId) {
      prevHadEditRoute.current = true;
      setCart([]);
      setDiscount(0);
      setPaymentMethod("cash");
      setSelectedClientId(null);
    } else if (prevHadEditRoute.current) {
      prevHadEditRoute.current = false;
      setCart([]);
      setDiscount(0);
      setPaymentMethod("cash");
      setSelectedClientId(null);
    }
  }, [editSaleId]);

  useEffect(() => {
    if (!editSaleId) {
      setSaleToEdit(null);
      setEditLoadError(null);
      setEditHydrated(false);
      return;
    }
    if (!localStorage.getItem("ecom360_access_token")) return;
    let cancelled = false;
    setEditLoadError(null);
    setEditHydrated(false);
    setSaleToEdit(null);
    getSale(editSaleId)
      .then((sale) => {
        if (cancelled) return;
        if (sale.status !== "completed") {
          setEditLoadError("Seules les ventes validées peuvent être modifiées.");
          return;
        }
        setSaleToEdit(sale);
        if (sale.storeId !== activeStore?.id) {
          setActiveStoreId(sale.storeId);
        }
      })
      .catch((e) => {
        if (!cancelled) setEditLoadError(e instanceof Error ? e.message : t.pos.editSaleLoadError);
      });
    return () => {
      cancelled = true;
    };
  }, [editSaleId, setActiveStoreId]);

  useEffect(() => {
    if (!editSaleId || !saleToEdit || editHydrated) return;
    if (activeStore?.id !== saleToEdit.storeId) return;
    const lines = saleToEdit.lines.map((line) => {
      const p = products.find((pr) => pr.id === line.productId);
      return {
        id: line.productId,
        name: p?.name ?? line.productName,
        price: p?.price ?? line.unitPrice,
        qty: line.quantity,
      };
    });
    setCart(lines);
    setDiscount(saleToEdit.discountAmount);
    setPaymentMethod((saleToEdit.paymentMethod as PaymentMethod) || "cash");
    setSelectedClientId(saleToEdit.clientId);
    setEditHydrated(true);
  }, [editSaleId, saleToEdit, activeStore?.id, products, editHydrated]);

  useEffect(() => {
    const available = paymentMethods.some((m) => m.key === paymentMethod);
    if (!available) setPaymentMethod("cash");
  }, [paymentMethods, paymentMethod]);

  useEffect(() => {
    if (!localStorage.getItem("ecom360_access_token") || !activeStore?.id) {
      setProducts([]);
      setCategories(["Tous"]);
      setClients([]);
      return;
    }
    const load = async () => {
      try {
        const [stockList, catsRes, clientsRes] = await Promise.all([
          getStockByStore(activeStore.id),
          listCategories(),
          listClients({ page: 0, size: 200 }),
        ]);

        const catNames = catsRes.map((c) => c.name);
        setCategories(["Tous", ...catNames]);
        let nextClients: ClientForPOS[] = clientsRes.content.map((c) => ({
          id: c.id,
          name: c.name,
          creditBalance: c.creditBalance ?? 0,
          isWalkIn: false,
        }));
        let walkIn = nextClients.find((c) => isWalkInClientName(c.name));
        if (!walkIn) {
          try {
            const created = await createClient({ name: WALK_IN_CLIENT_NAME });
            walkIn = {
              id: created.id,
              name: created.name,
              creditBalance: created.creditBalance ?? 0,
              isWalkIn: true,
            };
            nextClients = [...nextClients, walkIn];
          } catch {
            // Ignore if concurrent cashier already created it.
          }
        }
        nextClients = nextClients.map((c) => ({
          ...c,
          isWalkIn: isWalkInClientName(c.name),
        }));
        setClients(nextClients);
        if (!editSaleId) {
          setSelectedClientId((prev) => {
            if (prev && nextClients.some((c) => c.id === prev)) return prev;
            const defaultClient = nextClients.find((c) => c.isWalkIn) ?? nextClients[0] ?? null;
            return defaultClient?.id ?? null;
          });
        }
        const byCat = Object.fromEntries(catsRes.map((c) => [c.id, c.name]));
        setProducts(
          stockList.map((s) => ({
            id: s.productId,
            name: s.productName,
            price: s.salePrice ?? 0,
            category: (s.categoryId && byCat[s.categoryId]) || "Divers",
            stock: s.quantity,
            minStock: s.minStock,
          }))
        );
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur chargement produits");
        setProducts([]);
        setClients([]);
      }
    };
    load();
  }, [activeStore?.id, editSaleId]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "/" || e.key === "s") {
      e.preventDefault();
      searchRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = category === "Tous" || p.category === category;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [category, search, products]);

  const displayedProducts = useMemo(
    () => filteredProducts.slice(0, productVisibleLimit),
    [filteredProducts, productVisibleLimit]
  );

  const remainingProductCount = filteredProducts.length - displayedProducts.length;

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);
  const total = Math.max(0, subtotal - discount);
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const originalQtyByProduct = useMemo(() => {
    if (!saleToEdit) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const l of saleToEdit.lines) {
      m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity);
    }
    return m;
  }, [saleToEdit]);

  const maxQtyForProduct = useCallback(
    (productId: string) => {
      const prod = products.find((p) => p.id === productId);
      const orig = editSaleId && saleToEdit ? (originalQtyByProduct.get(productId) ?? 0) : 0;
      return (prod ? prod.stock : 0) + orig;
    },
    [products, editSaleId, saleToEdit, originalQtyByProduct]
  );

  const addToCart = (p: (typeof products)[0]) => {
    const maxStock = maxQtyForProduct(p.id);
    if (maxStock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.id === p.id);
      if (existing) {
        if (existing.qty >= maxStock) return prev;
        return prev.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const line = prev.find((l) => l.id === id);
      if (!line) return prev;
      const maxStock = maxQtyForProduct(id);
      let newQty = line.qty + delta;
      if (newQty > maxStock) newQty = maxStock;
      if (newQty <= 0) return prev.filter((l) => l.id !== id);
      return prev.map((l) => (l.id === id ? { ...l, qty: newQty } : l));
    });
  };

  const removeLine = (id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  };

  const handleQuickClientCreate = () =>
    quickClientForm.validateFields().then(async (values) => {
      setCreatingClient(true);
      try {
        const c = await createClient({
          name: values.name.trim(),
          phone: values.phone?.trim() || undefined,
        });
        setClients((prev) => [
          ...prev,
          {
            id: c.id,
            name: c.name,
            creditBalance: c.creditBalance ?? 0,
            isWalkIn: isWalkInClientName(c.name),
          },
        ]);
        setSelectedClientId(c.id);
        message.success(t.pos.clientCreatedSelected);
        setQuickClientOpen(false);
        quickClientForm.resetFields();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur");
        throw e;
      } finally {
        setCreatingClient(false);
      }
    });

  const validateSale = async () => {
    if (cart.length === 0) {
      message.warning(t.pos.addAtLeastOne);
      return;
    }
    if (!activeStore?.id) {
      message.warning("Sélectionnez une boutique");
      return;
    }
    if (!selectedClientId) {
      message.warning("Sélectionnez un client avant de valider");
      return;
    }
    if (paymentMethod === "credit" && selectedClient?.isWalkIn) {
      message.warning("Pour le crédit, sélectionnez un client nominatif");
      return;
    }
    if (editSaleId && saleToEdit && activeStore.id !== saleToEdit.storeId) {
      message.warning(t.pos.editSaleWrongStore);
      return;
    }
    for (const line of cart) {
      const p = products.find((pr) => pr.id === line.id);
      const unitPrice = p !== undefined ? p.price : line.price;
      if (!editSaleId && !p) {
        message.warning(t.pos.cartProductUnavailable);
        return;
      }
      if (unitPrice <= 0) {
        message.warning(t.pos.cartUnitPriceInvalid);
        return;
      }
    }
    const discountRounded = Math.round(discount);
    const subtotalRounded = cart.reduce((s, l) => {
      const p = products.find((pr) => pr.id === l.id);
      const unit = p !== undefined ? p.price : l.price;
      return s + unit * l.qty;
    }, 0);
    if (discountRounded > subtotalRounded) {
      message.warning(t.pos.discountExceedsSubtotal);
      return;
    }
    const totalAfterDiscount = Math.max(0, subtotalRounded - discountRounded);

    setLoading(true);
    try {
      const body = {
        storeId: activeStore.id,
        clientId: selectedClientId,
        paymentMethod,
        discountAmount: discountRounded,
        amountReceived:
          paymentMethod === "cash" || paymentMethod === "wave" || paymentMethod === "orange_money"
            ? totalAfterDiscount
            : undefined,
        lines: cart.map((l) => ({ productId: l.id, quantity: l.qty })),
      };
      const sale = editSaleId ? await updateSale(editSaleId, body) : await createSale(body);
      message.success(editSaleId ? t.pos.editSaleSuccess : t.pos.paymentSuccess);
      setCart([]);
      if (editSaleId) {
        setSelectedClientId(null);
      } else {
        const defaultClient = clients.find((c) => c.isWalkIn) ?? clients[0] ?? null;
        setSelectedClientId(defaultClient?.id ?? null);
      }
      navigate("/receipt", {
        state: {
          sale,
          cart,
          total: sale.total,
          discount: sale.discountAmount,
          method: paymentMethod,
        },
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.pos.paymentError);
    } finally {
      setLoading(false);
    }
  };

  const editSaleLoading = Boolean(editSaleId && !editLoadError && (!saleToEdit || !editHydrated));

  if (editLoadError) {
    return (
      <div
        style={{
          padding: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
        }}
      >
        <Result
          status="error"
          title="Modification impossible"
          subTitle={editLoadError}
          extra={
            <Button type="primary" onClick={() => navigate("/sales")}>
              Retour aux ventes
            </Button>
          }
        />
      </div>
    );
  }

  if (editSaleLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          minHeight: 360,
        }}
      >
        <Spin size="large" />
        <Typography.Text type="secondary">{t.pos.editSaleTitle}…</Typography.Text>
      </div>
    );
  }

  return (
    <>
      <div className={styles.pos}>
        {/* Left: search + categories + product grid */}
        <div className={styles.left}>
          <Input
            ref={searchRef}
            prefix={<Search size={20} />}
            placeholder={`${t.products.search} (appuyez /)`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="large"
            className={styles.search}
            allowClear
            /* eslint-disable-next-line jsx-a11y/no-autofocus -- POS: search is primary action, focus on load improves checkout speed */
            autoFocus
          />
          <div className={styles.categories}>
            {categories.map((c) => (
              <Button
                key={c}
                type={category === c ? "primary" : "default"}
                onClick={() => setCategory(c)}
                className={styles.catBtn}
              >
                {c}
              </Button>
            ))}
          </div>
          <div className={styles.productGridWrap}>
            <div className={styles.productGrid}>
              {displayedProducts.map((p) => {
                const cartItem = cart.find((l) => l.id === p.id);
                const maxStock = maxQtyForProduct(p.id);
                const availableStock = maxStock - (cartItem?.qty ?? 0);
                const level = stockLevel(availableStock, p.minStock);
                const outOfStock = availableStock <= 0;
                const catColor = CATEGORY_COLORS[p.category] || "#999";
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`${styles.productCard} ${outOfStock ? styles.productCardDisabled : ""} ${cartItem ? styles.productCardInCart : ""}`}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    aria-disabled={outOfStock}
                  >
                    <div className={styles.productTop}>
                      <span
                        className={styles.productAvatar}
                        style={{ background: catColor + "20", color: catColor }}
                      >
                        {categoryInitial(p.category)}
                      </span>
                      {cartItem && <span className={styles.cartQtyBadge}>{cartItem.qty}</span>}
                    </div>
                    <span className={styles.productName}>{p.name}</span>
                    <span className={`amount ${styles.productPrice}`}>
                      {p.price.toLocaleString("fr-FR")} F
                    </span>
                    <span className={`${styles.stockBadge} ${styles[`stock_${level}`]}`}>
                      {outOfStock
                        ? t.pos.outOfStock
                        : level === "low"
                          ? `Stock: ${availableStock} ⚠`
                          : `Stock: ${availableStock}`}
                    </span>
                  </button>
                );
              })}
            </div>
            {remainingProductCount > 0 && (
              <Button
                type="default"
                block
                size="large"
                onClick={() => setProductVisibleLimit((v) => v + productPageSize)}
              >
                {t.pos.loadMoreProducts} ({remainingProductCount})
              </Button>
            )}
          </div>
        </div>

        {/* Center: cart */}
        <Card className={styles.cartCard} variant="borderless">
          <div className={styles.cartHeader}>
            <ShoppingBag size={18} />
            <Typography.Text strong style={{ fontSize: 15, flex: 1 }}>
              Panier
            </Typography.Text>
            {itemCount > 0 && (
              <>
                <Badge count={itemCount} style={{ backgroundColor: "var(--color-primary)" }} />
                <button
                  type="button"
                  className={styles.clearCartBtn}
                  onClick={() => setCart([])}
                  aria-label="Vider le panier"
                >
                  Vider
                </button>
              </>
            )}
          </div>
          {cart.length === 0 ? (
            <div className={styles.cartEmpty}>
              <ShoppingBag size={32} strokeWidth={1.5} />
              <span>Aucun article</span>
              <span className={styles.cartEmptyHint}>Cliquez sur un produit pour l'ajouter</span>
            </div>
          ) : (
            <div className={styles.cartList}>
              {cart.map((l) => (
                <div key={l.id} className={styles.cartLine}>
                  <div className={styles.cartLineInfo}>
                    <span className={styles.cartLineName}>{l.name}</span>
                    <span className={styles.cartLineMeta}>
                      {l.price.toLocaleString("fr-FR")} F × {l.qty}
                    </span>
                  </div>
                  <div className={styles.cartLineActions}>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => updateQty(l.id, -1)}
                      aria-label="Diminuer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={`amount ${styles.qtyDisplay}`}>{l.qty}</span>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => updateQty(l.id, 1)}
                      aria-label="Augmenter"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.qtyBtn} ${styles.qtyBtnDanger}`}
                      onClick={() => removeLine(l.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span className={`amount ${styles.lineTotal}`}>
                    {(l.price * l.qty).toLocaleString("fr-FR")} F
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: payment method selection + total + CTA */}
        <div className={styles.right}>
          <Card className={styles.totalCard} variant="borderless">
            {/* Payment method selection */}
            <div className={styles.paymentSection}>
              <Typography.Text type="secondary" className={styles.paymentSectionLabel}>
                Mode de paiement
              </Typography.Text>
              <div className={styles.paymentGrid} role="radiogroup" aria-label="Mode de paiement">
                {paymentMethods.map(({ key, label, hint, image, color, bg }) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === key}
                    className={`${styles.payMethodBtn} ${paymentMethod === key ? styles.payMethodActive : ""}`}
                    onClick={() => {
                      setPaymentMethod(key);
                    }}
                    style={
                      paymentMethod === key
                        ? {
                            borderColor: color,
                            background: bg,
                          }
                        : undefined
                    }
                  >
                    <span className={styles.payMethodVisual} aria-hidden>
                      <img
                        src={image}
                        alt=""
                        className={
                          key === "wave" || key === "orange_money"
                            ? `${styles.payMethodImg} ${styles.payMethodImgBrand}`
                            : styles.payMethodImg
                        }
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <span className={styles.payMethodLabel}>{label}</span>
                    <span className={styles.payMethodHint}>{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.clientRow}>
              <div className={styles.clientRowHeader}>
                <Typography.Text type="secondary">
                  {paymentMethod === "credit" ? "Client (crédit)" : "Client"}
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  className={styles.quickAddClientBtn}
                  icon={<Plus size={16} strokeWidth={2.25} aria-hidden />}
                  onClick={() => setQuickClientOpen(true)}
                >
                  {t.pos.quickAddClient}
                </Button>
              </div>
              <Typography.Text type="secondary" className={styles.clientCreditHint}>
                {t.pos.quickAddClientHint}
              </Typography.Text>
              <Select
                placeholder="Sélectionner un client"
                value={selectedClientId}
                onChange={setSelectedClientId}
                options={clients.map((c) => ({
                  value: c.id,
                  label: c.isWalkIn ? `${c.name} (par défaut)` : c.name,
                }))}
                style={{ width: "100%" }}
                size="large"
                showSearch
                optionFilterProp="label"
                notFoundContent={
                  <span className={styles.selectEmptyHint}>{t.pos.selectClientNotFound}</span>
                }
              />
              {paymentMethod === "credit" && selectedClientId && (
                <Typography.Text
                  type="secondary"
                  style={{ display: "block", marginTop: 8, fontSize: 13 }}
                >
                  Dette actuelle : {(selectedClient?.creditBalance ?? 0).toLocaleString("fr-FR")} F
                  {" · "}Après cette vente :{" "}
                  <strong>
                    {((selectedClient?.creditBalance ?? 0) + total).toLocaleString("fr-FR")} F
                  </strong>
                </Typography.Text>
              )}
            </div>

            <div className={styles.totalDivider} />

            {/* Discount */}
            <div className={styles.discountRow}>
              <Typography.Text type="secondary">{t.pos.discount}</Typography.Text>
              <CurrencyInput
                min={0}
                value={discount}
                onChange={(v) => setDiscount(Number(v) || 0)}
                style={{ width: 140 }}
              />
            </div>

            {/* Total */}
            <div className={styles.totalRow}>
              <Typography.Text type="secondary">Total</Typography.Text>
              <Typography.Title level={2} className={styles.totalAmount}>
                {total.toLocaleString("fr-FR")} F
              </Typography.Title>
            </div>

            {!editSaleId && salesAtLimit && (
              <div
                style={{
                  padding: 12,
                  marginBottom: 12,
                  background: "rgba(239,68,68,0.08)",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "var(--color-danger)",
                }}
              >
                Limite des ventes mensuelles atteinte.{" "}
                <Link to="/settings/subscription" style={{ fontWeight: 600 }}>
                  Passer à un plan supérieur
                </Link>
              </div>
            )}
            {/* Single validate CTA */}
            <Button
              type="primary"
              size="large"
              block
              className={styles.validateBtn}
              onClick={validateSale}
              loading={loading}
              disabled={
                cart.length === 0 ||
                (!!editSaleId && !editHydrated) ||
                (!editSaleId && salesAtLimit)
              }
            >
              {editSaleId ? t.pos.updateSale : t.pos.validateSale}
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        title={t.pos.quickAddClientTitle}
        open={quickClientOpen}
        onCancel={() => {
          setQuickClientOpen(false);
          quickClientForm.resetFields();
        }}
        okText={t.common.save}
        cancelText={t.common.cancel}
        confirmLoading={creatingClient}
        destroyOnClose
        maskClosable={!creatingClient}
        onOk={handleQuickClientCreate}
      >
        <Form
          form={quickClientForm}
          layout="vertical"
          style={{ marginTop: 8 }}
          requiredMark="optional"
        >
          <Form.Item
            name="name"
            label={t.common.name}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder="Nom affiché sur le ticket" size="large" autoFocus />
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
            <Input placeholder="77 123 45 67 (facultatif)" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
