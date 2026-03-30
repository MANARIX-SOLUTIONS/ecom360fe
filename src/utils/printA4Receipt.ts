/**
 * Print A4 receipt via dedicated window — industry-standard approach.
 * Avoids layout interference from the main app (visibility, min-height, etc.).
 */

const METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  credit: "Crédit client",
};

function formatPrice(n: number): string {
  return n.toLocaleString("fr-FR") + " F";
}

export type A4ReceiptData = {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  /** HTTPS URL, pré-validée côté appelant */
  shopLogoUrl?: string;
  receiptId: string;
  now: Date;
  lines: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  total: number;
  discount: number;
  method: string;
  i18n: {
    invoiceRef: string;
    dateTime: string;
    name: string;
    qtyShort: string;
    unitPrice: string;
    total: string;
    subtotal: string;
    discount: string;
    paymentMethod: string;
    thankYouEnterprise: string;
    legalNotice: string;
    docTypeBadge: string;
    detailLinesTitle: string;
  };
};

const A4_PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    color: #0f172a;
    background: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .a4-page { width: 210mm; min-height: 257mm; margin: 0 auto; padding: 0; display: flex; flex-direction: column; }
  .a4-topbar {
    height: 5px;
    background: linear-gradient(90deg, #1b4d7a 0%, #0e7490 50%, #1b4d7a 100%);
    border-radius: 2px;
    margin-bottom: 22px;
  }
  .a4-content { flex: 0 0 auto; }
  .a4-footer {
    flex: 1 1 auto;
    margin-top: auto;
    min-height: 56px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding-top: 28px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
  }
  .a4-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    padding-bottom: 22px;
    margin-bottom: 20px;
    border-bottom: 1px solid #e2e8f0;
  }
  .a4-brand { flex: 1; min-width: 0; padding-right: 8px; }
  .a4-doc-badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #1b4d7a;
    background: linear-gradient(180deg, #f0f7fc 0%, #e8f0f8 100%);
    border: 1px solid rgba(27, 77, 122, 0.2);
    padding: 5px 12px;
    border-radius: 999px;
    margin-bottom: 12px;
  }
  .a4-logo-wrap { margin-bottom: 10px; }
  .a4-logo-img { max-height: 52px; max-width: 240px; object-fit: contain; display: block; }
  .a4-shop-name {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: #0f172a;
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.15;
  }
  .a4-address { margin: 10px 0 0; font-size: 12.5px; color: #475569; line-height: 1.55; max-width: 42ch; }
  .a4-phone { margin: 6px 0 0; font-size: 12.5px; color: #64748b; }
  .a4-ref-block {
    flex-shrink: 0;
    text-align: right;
    padding: 16px 20px;
    background: linear-gradient(165deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  }
  .a4-ref-label { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 6px; }
  .a4-ref-value { font-size: 19px; font-weight: 700; font-variant-numeric: tabular-nums; color: #1b4d7a; letter-spacing: -0.02em; }
  .a4-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    padding: 8px 14px;
    font-size: 12.5px;
    color: #475569;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #f1f5f9;
  }
  .a4-section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin-bottom: 10px;
  }
  .a4-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  .a4-table th {
    text-align: left;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
    padding: 12px 14px;
    background: #f1f5f9;
    border-bottom: 2px solid #e2e8f0;
  }
  .a4-table th:nth-child(2), .a4-table th:nth-child(3), .a4-table th:nth-child(4) { text-align: right; }
  .a4-table tbody tr:nth-child(even) td { background: #fafbfc; }
  .a4-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-variant-numeric: tabular-nums; color: #334155; }
  .a4-table td:nth-child(2), .a4-table td:nth-child(3), .a4-table td:nth-child(4) { text-align: right; }
  .a4-totals {
    margin: 20px 0 22px;
    padding: 20px 0 0;
    border-top: 2px solid #1b4d7a;
  }
  .a4-total-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; margin-bottom: 8px; max-width: 300px; margin-left: auto; }
  .a4-total-row span:first-child { color: #64748b; }
  .a4-discount { color: #0d9488; font-weight: 600; }
  .a4-total-final {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 20px;
    font-weight: 700;
    margin-top: 14px;
    padding: 14px 18px;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    max-width: 300px;
    margin-left: auto;
    color: #0f172a;
  }
  .a4-total-final span:last-child { color: #1b4d7a; font-variant-numeric: tabular-nums; }
  .a4-payment {
    font-size: 13px;
    margin-bottom: 28px;
    padding: 10px 14px;
    background: #fff;
    border-left: 3px solid #0e7490;
    border-radius: 0 8px 8px 0;
  }
  .a4-payment-label { color: #64748b; margin-right: 10px; font-weight: 600; }
  .a4-thank-you { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #0f172a; letter-spacing: -0.02em; }
  .a4-legal { margin: 0; font-size: 10.5px; color: #94a3b8; line-height: 1.65; max-width: 460px; margin-left: auto; margin-right: auto; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .a4-page { page-break-inside: avoid; break-inside: avoid; }
  }
  @page { size: A4 portrait; margin: 18mm; }
`;

function buildA4ReceiptHTML(data: A4ReceiptData): string {
  const dt = data.now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const tm = data.now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const method = METHOD_LABELS[data.method] || data.method;

  const rows = data.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.productName)}</td><td>${l.quantity}</td><td>${formatPrice(l.unitPrice)}</td><td>${formatPrice(l.lineTotal)}</td></tr>`
    )
    .join("");

  const logoSrc =
    data.shopLogoUrl != null && data.shopLogoUrl.trim().length > 0
      ? resolveImageUrlForPrint(data.shopLogoUrl)
      : "";
  const logoBlock =
    logoSrc.length > 0
      ? `<div class="a4-logo-wrap"><img src="${escapeHtml(logoSrc)}" alt="" class="a4-logo-img" /></div>`
      : "";

  const discountRows =
    data.discount > 0
      ? `
    <div class="a4-total-row"><span>${data.i18n.subtotal}</span><span>${formatPrice(data.subtotal)}</span></div>
    <div class="a4-total-row"><span>${data.i18n.discount}</span><span class="a4-discount">-${formatPrice(data.discount)}</span></div>
  `
      : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu A4 ${escapeHtml(data.receiptId)} - 360 PME Commerce</title>
  <style>${A4_PRINT_STYLES}</style>
</head>
<body>
  <div class="a4-page">
    <div class="a4-topbar" aria-hidden="true"></div>
    <div class="a4-content">
      <header class="a4-header">
        <div class="a4-brand">
          <span class="a4-doc-badge">${escapeHtml(data.i18n.docTypeBadge)}</span>
          ${logoBlock}
          <h1 class="a4-shop-name">${escapeHtml(data.shopName)}</h1>
          ${data.shopAddress ? `<p class="a4-address">${escapeHtml(data.shopAddress)}</p>` : ""}
          ${data.shopPhone ? `<p class="a4-phone">${escapeHtml(data.shopPhone)}</p>` : ""}
        </div>
        <div class="a4-ref-block">
          <span class="a4-ref-label">${data.i18n.invoiceRef}</span>
          <span class="a4-ref-value">${escapeHtml(data.receiptId)}</span>
        </div>
      </header>
      <div class="a4-meta">
        ${data.i18n.dateTime}: ${dt} à ${tm}
      </div>
      <p class="a4-section-title">${escapeHtml(data.i18n.detailLinesTitle)}</p>
      <table class="a4-table">
        <thead><tr><th>${data.i18n.name}</th><th>${data.i18n.qtyShort}</th><th>${data.i18n.unitPrice}</th><th>${data.i18n.total}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <section class="a4-totals">
        ${discountRows}
        <div class="a4-total-final"><span>${data.i18n.total}</span><span>${formatPrice(data.total)}</span></div>
      </section>
      <div class="a4-payment">
        <span class="a4-payment-label">${data.i18n.paymentMethod}</span>
        <span>${escapeHtml(method)}</span>
      </div>
    </div>
    <footer class="a4-footer">
      <p class="a4-thank-you">${data.i18n.thankYouEnterprise}</p>
      <p class="a4-legal">${data.i18n.legalNotice}</p>
    </footer>
  </div>
  <script>
    (function() {
      var printed = false;
      function doPrint() {
        if (printed) return;
        printed = true;
        window.print();
        window.onafterprint = function() { window.close(); };
      }
      function afterImages() {
        var imgs = document.images, n = imgs.length, done = 0;
        if (n === 0) { setTimeout(doPrint, 120); return; }
        function tick() {
          if (++done >= n) setTimeout(doPrint, 80);
        }
        for (var i = 0; i < n; i++) {
          if (imgs[i].complete) tick();
          else { imgs[i].onload = tick; imgs[i].onerror = tick; }
        }
        setTimeout(function() { if (done < n) doPrint(); }, 2500);
      }
      if (document.readyState === 'complete') afterImages();
      else window.onload = afterImages;
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  const el = document.createElement("div");
  el.textContent = s;
  return el.innerHTML;
}

/**
 * Les documents chargés depuis une URL `blob:` ne résolvent pas toujours correctement
 * les chemins relatifs (`/api/...`) pour les ressources — le logo ne s'affiche pas à l'impression.
 * Forcer une URL absolue (même origine que l'app) garantit le chargement de l'image.
 */
function resolveImageUrlForPrint(url: string): string {
  if (typeof window === "undefined") return url;
  try {
    return new URL(url.trim(), window.location.href).href;
  } catch {
    return url;
  }
}

export function printA4Receipt(data: A4ReceiptData): void {
  const html = buildA4ReceiptHTML(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!printWindow) {
    URL.revokeObjectURL(url);
    console.warn("Print window blocked — allow popups for this site");
    return;
  }
  printWindow.focus();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
