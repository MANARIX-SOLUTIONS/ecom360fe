import { useEffect, useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Button, Result, Spin } from "antd";
import { Printer, ShoppingCart, Share2, CheckCircle } from "lucide-react";
import { t } from "@/i18n";
import { useStore } from "@/contexts/StoreContext";
import { getSale, ApiError } from "@/api";
import type { SaleResponse } from "@/api";
import styles from "./Receipt.module.css";

type LocationState = {
  sale?: SaleResponse;
  saleId?: string;
  cart?: { id: string; name: string; price: number; qty: number }[];
  total?: number;
  discount?: number;
  method?: string;
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  credit: "Crédit client",
};

function formatPrice(n: number): string {
  return n.toLocaleString("fr-FR") + " F";
}

function handleShare(total: number, method: string, receiptId?: string) {
  const text = `Vente ${receiptId ? receiptId + " - " : ""}${formatPrice(total)} (${METHOD_LABELS[method] || method}) - 360 PME Commerce`;
  if (navigator.share) {
    navigator.share({ title: "Ticket de vente", text }).catch(() => {});
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard?.writeText(text);
  }
}

export default function Receipt() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeStore } = useStore();
  const state = location.state as LocationState | null;
  const [fetchedSale, setFetchedSale] = useState<SaleResponse | null>(null);
  const [loading, setLoading] = useState(!!state?.saleId && !state?.sale);
  const [saleNotFound, setSaleNotFound] = useState(false);

  useEffect(() => {
    if (state?.saleId && !state?.sale) {
      getSale(state.saleId)
        .then(setFetchedSale)
        .catch((e) => {
          if (e instanceof ApiError && e.status === 404) {
            setSaleNotFound(true);
          } else {
            navigate("/dashboard", { replace: true });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [state?.saleId, state?.sale, navigate]);

  if (!state) {
    return <Navigate to="/pos" replace />;
  }

  const sale = state.sale ?? fetchedSale ?? null;
  const cart = state.cart ?? [];
  const total = state.total ?? sale?.total ?? 0;
  const discount = state.discount ?? sale?.discountAmount ?? 0;
  const method = state.method ?? sale?.paymentMethod ?? "cash";

  if (saleNotFound) {
    return (
      <div
        className={styles.wrapper}
        style={{ padding: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Result
          status="404"
          title="Vente introuvable"
          subTitle="Cette vente n'existe pas ou a été supprimée."
          extra={
            <Button type="primary" onClick={() => navigate("/dashboard", { replace: true })}>
              Retour au tableau de bord
            </Button>
          }
        />
      </div>
    );
  }
  if (loading || (state.saleId && !sale)) {
    return (
      <div className={styles.wrapper} style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (state.saleId && !sale) {
    return <Navigate to="/dashboard" replace />;
  }
  const now = sale?.createdAt ? new Date(sale.createdAt) : new Date();
  const receiptId = sale?.receiptNumber ?? `T${now.getTime().toString(36).toUpperCase()}`;

  useEffect(() => {
    document.title = `Ticket ${receiptId} - 360 PME Commerce`;
    return () => {
      document.title = "360 PME Commerce";
    };
  }, [receiptId]);
  const subtotal = sale?.subtotal ?? cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const displayTotal = sale?.total ?? total;
  const displayDiscount = sale?.discountAmount ?? discount;

  return (
    <main className={styles.wrapper} role="main" aria-label={t.receipt.saleSummary}>
      {/* Success indicator */}
      <div className={styles.successBanner}>
        <CheckCircle size={40} className={styles.successIcon} />
        <span className={styles.successText}>{t.pos.paymentSuccess}</span>
      </div>

      <article className={styles.receipt} id="receipt-print" aria-label={t.receipt.ticket}>
        <header className={styles.header}>
          <h1 className={styles.shopName}>
            {sale?.storeName || activeStore?.name || "360 PME Commerce"}
          </h1>
          {(sale?.storeAddress || activeStore?.address) && (
            <p className={styles.shopAddress}>{sale?.storeAddress || activeStore?.address}</p>
          )}
        </header>

        <hr className={styles.divider} aria-hidden />

        <div className={styles.metaBlock}>
          <p className={styles.ticketTitle}>{t.receipt.ticket}</p>
          <p className={styles.receiptId}>{receiptId}</p>
          <time className={styles.datetime} dateTime={now.toISOString()}>
            {now.toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "}
            ·{" "}
            {now.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>

        <hr className={styles.divider} aria-hidden />

        <table className={styles.lines} role="table" aria-label="Lignes de la vente">
          <thead>
            <tr>
              <th scope="col" className={styles.colDesc}>
                {t.common.name}
              </th>
              <th scope="col" className={styles.colQty}>
                {t.receipt.qtyShort}
              </th>
              <th scope="col" className={styles.colPrice}>
                {t.receipt.unitPrice}
              </th>
              <th scope="col" className={styles.colTotal}>
                {t.common.total}
              </th>
            </tr>
          </thead>
          <tbody>
            {(
              sale?.lines ??
              cart.map((l) => ({
                productId: l.id,
                productName: l.name,
                quantity: l.qty,
                unitPrice: l.price,
                lineTotal: l.price * l.qty,
              }))
            ).map((line, i) => (
              <tr key={line.productId ?? i}>
                <td className={styles.colDesc}>
                  <span className={styles.productName}>{line.productName}</span>
                </td>
                <td className={styles.colQty}>{line.quantity}</td>
                <td className={styles.colPrice}>{formatPrice(line.unitPrice)}</td>
                <td className={styles.colTotal}>{formatPrice(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className={styles.divider} aria-hidden />

        <section className={styles.totals} aria-label="Totaux">
          {displayDiscount > 0 && (
            <>
              <div className={styles.row}>
                <span>{t.receipt.subtotal}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className={styles.row}>
                <span>{t.pos.discount}</span>
                <span className={styles.discount}>-{formatPrice(displayDiscount)}</span>
              </div>
            </>
          )}
          <div className={styles.rowTotal}>
            <span>{t.common.total}</span>
            <span>{formatPrice(displayTotal)}</span>
          </div>
        </section>

        <hr className={styles.divider} aria-hidden />

        <p className={styles.payment}>
          <span className={styles.paymentLabel}>{t.receipt.paymentMethod}</span>
          <span>{METHOD_LABELS[method] || method}</span>
        </p>

        <footer className={styles.footer}>
          <p>{t.receipt.thankYou}</p>
        </footer>
      </article>

      <div className={styles.actions} aria-hidden>
        <Button
          size="large"
          icon={<Share2 size={18} />}
          onClick={() => handleShare(displayTotal, method, receiptId)}
          aria-label="Partager"
        >
          Partager
        </Button>
        <Button
          size="large"
          icon={<Printer size={18} />}
          onClick={() => window.print()}
          aria-label={t.receipt.print}
        >
          {t.receipt.print}
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<ShoppingCart size={18} />}
          onClick={() => navigate("/pos")}
          aria-label={t.receipt.newSale}
        >
          {t.receipt.newSale}
        </Button>
      </div>
    </main>
  );
}
