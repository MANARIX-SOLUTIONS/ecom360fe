import { useEffect, useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Button, Result, Spin, message } from "antd";
import {
  Printer,
  ShoppingCart,
  Share2,
  CheckCircle,
  FileText,
  Layout,
  ChevronDown,
  ChevronUp,
  Home,
} from "lucide-react";
import { t } from "@/i18n";
import { useStore } from "@/hooks/useStore";
import { getSale, ApiError } from "@/api";
import { getBusinessProfile } from "@/api/business";
import type { SaleResponse } from "@/api";
import type { BusinessProfile } from "@/api/business";
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
    navigator
      .share({ title: "Ticket de vente", text })
      .then(() => {
        message.success("Partagé avec succès");
      })
      .catch(() => {});
  } else {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        message.success("Copié dans le presse-papiers");
      })
      .catch(() => {});
  }
}

type PrintFormat = "thermal" | "a4";

export type ReceiptTemplate = "moderne" | "classique" | "compact";

const RECEIPT_TEMPLATE_KEY = "ecom360_receipt_template";

const TEMPLATES: { id: ReceiptTemplate; label: string; desc: string }[] = [
  { id: "moderne", label: t.receipt.templateModerne, desc: t.receipt.templateModerneDesc },
  { id: "classique", label: t.receipt.templateClassique, desc: t.receipt.templateClassiqueDesc },
  { id: "compact", label: t.receipt.templateCompact, desc: t.receipt.templateCompactDesc },
];

function getStoredTemplate(): ReceiptTemplate {
  const stored = localStorage.getItem(RECEIPT_TEMPLATE_KEY);
  if (stored === "moderne" || stored === "classique" || stored === "compact") return stored;
  return "moderne";
}

export default function Receipt() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeStore } = useStore();
  const state = location.state as LocationState | null;
  const [fetchedSale, setFetchedSale] = useState<SaleResponse | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(!!state?.saleId && !state?.sale);
  const [saleNotFound, setSaleNotFound] = useState(false);
  const [template, setTemplate] = useState<ReceiptTemplate>(getStoredTemplate);
  const [templateExpanded, setTemplateExpanded] = useState(false);
  const [successBannerState, setSuccessBannerState] = useState<"visible" | "exiting" | "hidden">(
    "visible"
  );

  useEffect(() => {
    const hideTimer = setTimeout(() => setSuccessBannerState("exiting"), 3500);
    return () => clearTimeout(hideTimer);
  }, []);

  useEffect(() => {
    if (successBannerState !== "exiting") return;
    const removeTimer = setTimeout(() => setSuccessBannerState("hidden"), 400);
    return () => clearTimeout(removeTimer);
  }, [successBannerState]);

  const handleTemplateChange = (tpl: ReceiptTemplate) => {
    setTemplate(tpl);
    localStorage.setItem(RECEIPT_TEMPLATE_KEY, tpl);
  };
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

  useEffect(() => {
    getBusinessProfile()
      .then(setBusiness)
      .catch(() => setBusiness(null));
  }, []);

  const sale = state?.sale ?? fetchedSale ?? null;
  const now = sale?.createdAt ? new Date(sale.createdAt) : new Date();
  const receiptId = state
    ? (sale?.receiptNumber ?? `T${now.getTime().toString(36).toUpperCase()}`)
    : null;

  useEffect(() => {
    if (receiptId) {
      document.title = `Ticket ${receiptId} - 360 PME Commerce`;
      return () => {
        document.title = "360 PME Commerce";
      };
    }
  }, [receiptId]);

  const handlePrint = (format: PrintFormat) => {
    document.body.dataset.printFormat = format;
    document.documentElement.classList.add("print-active", `print-${format}`);
    // Brief delay so DOM and print styles are applied before dialog opens
    setTimeout(() => {
      window.print();
    }, 100);
  };

  useEffect(() => {
    const onAfterPrint = () => {
      document.body.removeAttribute("data-print-format");
      document.documentElement.classList.remove("print-active", "print-thermal", "print-a4");
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  if (!state) {
    return <Navigate to="/pos" replace />;
  }

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
      <main className={styles.wrapper}>
        <div className={styles.loadingState}>
          <Spin size="large" />
          <p className={styles.loadingText}>Chargement du reçu…</p>
        </div>
      </main>
    );
  }
  if (state.saleId && !sale) {
    return <Navigate to="/dashboard" replace />;
  }

  const subtotal = sale?.subtotal ?? cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const displayTotal = sale?.total ?? total;
  const displayDiscount = sale?.discountAmount ?? discount;
  const shopName = sale?.storeName || activeStore?.name || business?.name || "360 PME Commerce";
  const shopAddress = sale?.storeAddress || activeStore?.address || business?.address;
  const shopPhone = business?.phone;

  const lines =
    sale?.lines ??
    cart.map((l) => ({
      productId: l.id,
      productName: l.name,
      quantity: l.qty,
      unitPrice: l.price,
      lineTotal: l.price * l.qty,
    }));

  return (
    <main className={styles.wrapper} role="main" aria-label={t.receipt.saleSummary}>
      {(successBannerState === "visible" || successBannerState === "exiting") && (
        <div
          className={`${styles.successBanner} ${successBannerState === "exiting" ? styles.successBannerExiting : ""}`}
          role="status"
          aria-live="polite"
        >
          <CheckCircle size={40} className={styles.successIcon} />
          <span className={styles.successText}>{t.pos.paymentSuccess}</span>
        </div>
      )}

      {/* Thermal receipt (default screen + thermal print) */}
      <article
        className={`${styles.receipt} ${styles.receiptThermal} ${styles[`template${template.charAt(0).toUpperCase() + template.slice(1)}`]}`}
        id="receipt-print"
        aria-label={t.receipt.ticket}
        data-template={template}
      >
        <header className={styles.header}>
          <h1 className={styles.shopName}>{shopName}</h1>
          {shopAddress && <p className={styles.shopAddress}>{shopAddress}</p>}
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
            {lines.map((line, i) => (
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

        <div className={styles.payment}>
          <span className={styles.paymentLabel}>{t.receipt.paymentMethod}</span>
          <span className={styles.paymentValue}>{METHOD_LABELS[method] || method}</span>
        </div>

        <footer className={styles.footer}>
          <p>{t.receipt.thankYou}</p>
        </footer>
      </article>

      {/* A4 enterprise receipt (print only) */}
      <article
        className={`${styles.receipt} ${styles.receiptA4}`}
        id="receipt-a4"
        aria-hidden
        data-print-only
      >
        <div className={styles.a4Page}>
          <header className={styles.a4Header}>
            <div className={styles.a4Brand}>
              <h1 className={styles.a4ShopName}>{shopName}</h1>
              {shopAddress && <p className={styles.a4Address}>{shopAddress}</p>}
              {shopPhone && <p className={styles.a4Phone}>{shopPhone}</p>}
            </div>
            <div className={styles.a4RefBlock}>
              <span className={styles.a4RefLabel}>{t.receipt.invoiceRef}</span>
              <span className={styles.a4RefValue}>{receiptId}</span>
            </div>
          </header>

          <div className={styles.a4Meta}>
            <time className={styles.a4Datetime} dateTime={now.toISOString()}>
              {t.receipt.dateTime}:{" "}
              {now.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              à {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>

          <table className={styles.a4Table} role="table">
            <thead>
              <tr>
                <th>{t.common.name}</th>
                <th>{t.receipt.qtyShort}</th>
                <th>{t.receipt.unitPrice}</th>
                <th>{t.common.total}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.productId ?? i}>
                  <td>{line.productName}</td>
                  <td>{line.quantity}</td>
                  <td>{formatPrice(line.unitPrice)}</td>
                  <td>{formatPrice(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className={styles.a4Totals}>
            {displayDiscount > 0 && (
              <>
                <div className={styles.a4TotalRow}>
                  <span>{t.receipt.subtotal}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className={styles.a4TotalRow}>
                  <span>{t.pos.discount}</span>
                  <span className={styles.a4Discount}>-{formatPrice(displayDiscount)}</span>
                </div>
              </>
            )}
            <div className={styles.a4TotalFinal}>
              <span>{t.common.total}</span>
              <span>{formatPrice(displayTotal)}</span>
            </div>
          </section>

          <div className={styles.a4Payment}>
            <span className={styles.a4PaymentLabel}>{t.receipt.paymentMethod}</span>
            <span>{METHOD_LABELS[method] || method}</span>
          </div>

          <footer className={styles.a4Footer}>
            <p className={styles.a4ThankYou}>{t.receipt.thankYouEnterprise}</p>
            <p className={styles.a4Legal}>{t.receipt.legalNotice}</p>
          </footer>
        </div>
      </article>

      {/* Template selector (collapsible) */}
      <div className={styles.templateSection}>
        <button
          type="button"
          className={styles.templateToggle}
          onClick={() => setTemplateExpanded((e) => !e)}
          aria-expanded={templateExpanded}
          aria-controls="template-catalog"
        >
          <Layout size={18} />
          <span>{t.receipt.chooseTemplate}</span>
          {templateExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {templateExpanded && (
          <div id="template-catalog" className={styles.templateCatalog} role="region">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`${styles.templateCard} ${template === tpl.id ? styles.templateCardActive : ""}`}
                onClick={() => handleTemplateChange(tpl.id)}
                aria-pressed={template === tpl.id}
                aria-label={`Template ${tpl.label}`}
              >
                <span className={styles.templateCardName}>{tpl.label}</span>
                <span className={styles.templateCardDesc}>{tpl.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button
          type="primary"
          size="large"
          icon={<ShoppingCart size={20} />}
          onClick={() => navigate("/pos")}
          aria-label={t.receipt.newSale}
          className={styles.actionBtnMain}
        >
          {t.receipt.newSale}
        </Button>
        <div className={styles.actionsSecondary}>
          <Button
            size="large"
            icon={<Share2 size={18} />}
            onClick={() => handleShare(displayTotal, method, receiptId ?? undefined)}
            aria-label="Partager le reçu"
            title="Partager ou copier le résumé"
            className={styles.actionBtn}
          >
            Partager
          </Button>
          <Button
            size="large"
            icon={<Printer size={18} />}
            onClick={() => handlePrint("thermal")}
            aria-label={t.receipt.printThermal}
            title="Imprimante thermique (80mm)"
            className={styles.actionBtn}
          >
            Ticket
          </Button>
          <Button
            size="large"
            icon={<FileText size={18} />}
            onClick={() => handlePrint("a4")}
            aria-label={t.receipt.printA4}
            title="Reçu format A4 pour le client"
            className={styles.actionBtn}
          >
            Reçu A4
          </Button>
        </div>
        <Button
          type="link"
          size="small"
          icon={<Home size={16} />}
          onClick={() => navigate("/dashboard", { replace: true })}
          className={styles.backLink}
        >
          Retour au tableau de bord
        </Button>
      </div>
    </main>
  );
}
