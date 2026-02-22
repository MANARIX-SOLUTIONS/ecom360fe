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
  };
};

const A4_PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #fff; }
  .a4-page { width: 210mm; min-height: 257mm; margin: 0 auto; padding: 0; display: flex; flex-direction: column; }
  .a4-content { flex: 0 0 auto; }
  .a4-footer { flex: 1 1 auto; margin-top: auto; min-height: 60px; display: flex; flex-direction: column; justify-content: flex-end; padding-top: 24px; border-top: 1px solid #e0e0e0; text-align: center; }
  .a4-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #1b4d7a; margin-bottom: 24px; }
  .a4-brand { flex: 1; }
  .a4-shop-name { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #0f172a; font-family: Georgia, "Times New Roman", serif; }
  .a4-address { margin: 8px 0 0; font-size: 13px; color: #555; line-height: 1.5; }
  .a4-phone { margin: 4px 0 0; font-size: 13px; color: #555; }
  .a4-ref-block { text-align: right; padding: 14px 22px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .a4-ref-label { display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px; }
  .a4-ref-value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; color: #1b4d7a; }
  .a4-meta { margin-bottom: 24px; font-size: 13px; color: #555; }
  .a4-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px; }
  .a4-table th { text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; padding: 14px 18px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
  .a4-table th:nth-child(2), .a4-table th:nth-child(3), .a4-table th:nth-child(4) { text-align: right; }
  .a4-table td { padding: 14px 16px; border-bottom: 1px solid #eee; vertical-align: top; font-variant-numeric: tabular-nums; }
  .a4-table td:nth-child(2), .a4-table td:nth-child(3), .a4-table td:nth-child(4) { text-align: right; }
  .a4-totals { margin-bottom: 24px; padding: 24px 0; border-top: 3px solid #1b4d7a; }
  .a4-total-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; margin-bottom: 8px; max-width: 280px; margin-left: auto; }
  .a4-total-row span:first-child { color: #555; }
  .a4-discount { color: #0d9488; font-weight: 600; }
  .a4-total-final { display: flex; justify-content: space-between; align-items: baseline; font-size: 18px; font-weight: 700; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0; max-width: 280px; margin-left: auto; }
  .a4-payment { font-size: 14px; margin-bottom: 32px; }
  .a4-payment-label { color: #555; margin-right: 8px; }
  .a4-thank-you { margin: 0 0 10px; font-size: 17px; font-weight: 600; color: #0f172a; }
  .a4-legal { margin: 0; font-size: 11px; color: #64748b; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .a4-page { page-break-inside: avoid; break-inside: avoid; } }
  @page { size: A4 portrait; margin: 20mm; }
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
    <div class="a4-content">
      <header class="a4-header">
        <div class="a4-brand">
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
      function doPrint() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }
      if (document.readyState === 'complete') {
        setTimeout(doPrint, 100);
      } else {
        window.onload = doPrint;
      }
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
