import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Input, Button, InputNumber, Typography, message, Badge, Select } from "antd";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  Waves,
  Smartphone,
  UserCheck,
  ShoppingBag,
} from "lucide-react";
import { t } from "@/i18n";
import styles from "./POS.module.css";
import { useStore } from "@/hooks/useStore";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import {
  getStockByStore,
  listCategoriesWithDefaults,
  listProducts,
  listClients,
  createSale,
  getSubscriptionUsage,
} from "@/api";

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

const PAYMENT_METHODS: {
  key: PaymentMethod;
  label: string;
  icon: typeof Banknote;
  color: string;
  bg: string;
}[] = [
  {
    key: "cash",
    label: t.pos.cash,
    icon: Banknote,
    color: "var(--color-success)",
    bg: "rgba(46,204,113,0.10)",
  },
  {
    key: "wave",
    label: t.pos.wave,
    icon: Waves,
    color: "#1BA3E8",
    bg: "rgba(27,163,232,0.10)",
  },
  {
    key: "orange_money",
    label: t.pos.orangeMoney,
    icon: Smartphone,
    color: "#F39C12",
    bg: "rgba(243,156,18,0.10)",
  },
  {
    key: "credit",
    label: t.pos.credit,
    icon: UserCheck,
    color: "var(--color-primary)",
    bg: "rgba(31,58,95,0.10)",
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

export default function POS() {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const { canMultiPayment, canClientCredits } = usePlanFeatures();

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
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductForPOS[]>([]);
  const [categories, setCategories] = useState<string[]>(["Tous"]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [salesAtLimit, setSalesAtLimit] = useState(false);
  const searchRef = useRef<ReturnType<(typeof Input)["prototype"]["input"]>>(null);

  useEffect(() => {
    getSubscriptionUsage()
      .then((u) => setSalesAtLimit(u.salesLimit > 0 && u.salesThisMonth >= u.salesLimit))
      .catch(() => setSalesAtLimit(false));
  }, []);

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
        const [stockList, catsRes, productsRes, clientsRes] = await Promise.all([
          getStockByStore(activeStore.id),
          listCategoriesWithDefaults(),
          listProducts({ page: 0, size: 500 }),
          listClients({ page: 0, size: 200 }),
        ]);
        const catNames = catsRes.map((c) => c.name);
        setCategories(["Tous", ...catNames]);
        setClients(clientsRes.content.map((c) => ({ id: c.id, name: c.name })));
        const byCat = Object.fromEntries(catsRes.map((c) => [c.id, c.name]));
        const byProduct = Object.fromEntries(
          productsRes.content.map((p) => [p.id, { price: p.salePrice, categoryId: p.categoryId }])
        );
        setProducts(
          stockList.map((s) => {
            const info = byProduct[s.productId];
            return {
              id: s.productId,
              name: s.productName,
              price: info?.price ?? 0,
              category: (info?.categoryId && byCat[info.categoryId]) || "Divers",
              stock: s.quantity,
              minStock: s.minStock,
            };
          })
        );
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur chargement produits");
        setProducts([]);
        setClients([]);
      }
    };
    load();
  }, [activeStore?.id]);

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

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);
  const total = Math.max(0, subtotal - discount);
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  const addToCart = (p: (typeof products)[0]) => {
    if (p.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.id === p.id);
      const maxQty = p.stock;
      if (existing) {
        if (existing.qty >= maxQty) return prev;
        return prev.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const getProduct = (id: string) => products.find((p) => p.id === id);
  const updateQty = (id: string, delta: number) => {
    const prod = getProduct(id);
    setCart((prev) => {
      const line = prev.find((l) => l.id === id);
      if (!line) return prev;
      let newQty = line.qty + delta;
      if (prod && newQty > prod.stock) newQty = prod.stock;
      if (newQty <= 0) return prev.filter((l) => l.id !== id);
      return prev.map((l) => (l.id === id ? { ...l, qty: newQty } : l));
    });
  };

  const removeLine = (id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  };

  const validateSale = async () => {
    if (cart.length === 0) {
      message.warning(t.pos.addAtLeastOne);
      return;
    }
    if (!activeStore?.id) {
      message.warning("Sélectionnez une boutique");
      return;
    }
    if (paymentMethod === "credit" && !selectedClientId) {
      message.warning("Sélectionnez un client pour une vente à crédit");
      return;
    }
    setLoading(true);
    try {
      const sale = await createSale({
        storeId: activeStore.id,
        clientId: paymentMethod === "credit" ? selectedClientId : null,
        paymentMethod,
        discountAmount: Math.round(discount),
        amountReceived:
          paymentMethod === "cash" || paymentMethod === "wave" || paymentMethod === "orange_money"
            ? total
            : undefined,
        lines: cart.map((l) => ({ productId: l.id, quantity: l.qty })),
      });
      message.success(t.pos.paymentSuccess);
      setCart([]);
      setSelectedClientId(null);
      navigate("/receipt", {
        state: {
          sale,
          cart,
          total,
          discount,
          method: paymentMethod,
        },
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.pos.paymentError);
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <div className={styles.productGrid}>
          {filteredProducts.map((p) => {
            const cartItem = cart.find((l) => l.id === p.id);
            const availableStock = p.stock - (cartItem?.qty ?? 0);
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
      </div>

      {/* Center: cart */}
      <Card className={styles.cartCard} bordered={false}>
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
        <Card className={styles.totalCard} bordered={false}>
          {/* Payment method selection */}
          <div className={styles.paymentSection}>
            <Typography.Text type="secondary" className={styles.paymentSectionLabel}>
              Mode de paiement
            </Typography.Text>
            <div className={styles.paymentGrid}>
              {paymentMethods.map(({ key, label, icon: Icon, color, bg }) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.payMethodBtn} ${paymentMethod === key ? styles.payMethodActive : ""}`}
                  onClick={() => {
                    setPaymentMethod(key);
                    if (key !== "credit") setSelectedClientId(null);
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
                  <Icon
                    size={20}
                    style={{
                      color: paymentMethod === key ? color : undefined,
                    }}
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "credit" && (
            <div className={styles.clientRow}>
              <Typography.Text type="secondary">Client (crédit)</Typography.Text>
              <Select
                placeholder="Sélectionner un client"
                allowClear
                value={selectedClientId}
                onChange={setSelectedClientId}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                style={{ width: "100%" }}
                size="large"
              />
            </div>
          )}

          <div className={styles.totalDivider} />

          {/* Discount */}
          <div className={styles.discountRow}>
            <Typography.Text type="secondary">{t.pos.discount}</Typography.Text>
            <InputNumber
              min={0}
              value={discount}
              onChange={(v) => setDiscount(Number(v) || 0)}
              addonAfter="F"
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

          {salesAtLimit && (
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
            disabled={cart.length === 0 || salesAtLimit}
          >
            {t.pos.validateSale}
          </Button>
        </Card>
      </div>
    </div>
  );
}
