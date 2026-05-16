/**
 * Impression PDF rapport — fenêtre HTML A4 dédiée (pattern printA4Receipt).
 */

import type { ReportExportSnapshot } from "@/utils/reportExport";
import { sanitizeExternalImageUrl } from "@/utils/sanitizeImageUrl";

export type ReportPrintCopy = {
  docTitle: string;
  periodLabel: string;
  generatedLabel: string;
  storeLabel: string;
  sectionKpis: string;
  sectionPayments: string;
  sectionMargin: string;
  sectionSales: string;
  colMethod: string;
  colAmount: string;
  colPct: string;
  colReceipt: string;
  colDate: string;
  colTime: string;
  colTotal: string;
  colPayment: string;
  colStatus: string;
  colProduct: string;
  colMargin: string;
  trendVsPrev: string;
  footerDisclaimer: string;
  salesExcerptNote: string;
  thankYou: string;
};

function formatPrice(n: number): string {
  return n.toLocaleString("fr-FR") + " F";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTrend(pct: number | null, vsLabel: string): string {
  if (pct === null) return "";
  const sign = pct > 0 ? "+" : "";
  return `<span class="trend ${pct >= 0 ? "trend-up" : "trend-down"}">${sign}${pct}% ${escapeHtml(vsLabel)}</span>`;
}

function resolveImageUrlForPrint(url: string): string {
  const resolved = sanitizeExternalImageUrl(url);
  if (resolved) return resolved;
  if (typeof window === "undefined") return url;
  try {
    return new URL(url.trim(), window.location.href).href;
  } catch {
    return url;
  }
}

const REPORT_PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    color: #0f172a;
    background: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .a4-page { width: 210mm; min-height: 257mm; margin: 0 auto; padding: 0 14mm 12mm; }
  .a4-topbar {
    height: 5px;
    background: linear-gradient(90deg, #0f3460 0%, #0ea5e9 50%, #0f3460 100%);
    border-radius: 2px;
    margin-bottom: 18px;
  }
  .a4-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
  .a4-brand { flex: 1; }
  .a4-doc-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0ea5e9;
    margin-bottom: 8px;
  }
  .a4-logo-wrap { margin-bottom: 8px; }
  .a4-logo-img { max-height: 48px; max-width: 160px; object-fit: contain; }
  .a4-shop-name { font-size: 22px; font-weight: 700; color: #0f3460; margin-bottom: 4px; }
  .a4-meta-line { font-size: 12px; color: #475569; margin-bottom: 2px; }
  .a4-meta-block { text-align: right; font-size: 12px; color: #475569; min-width: 140px; }
  .a4-meta-block strong { display: block; color: #0f172a; font-size: 13px; margin-bottom: 4px; }
  .a4-section-title {
    font-size: 13px;
    font-weight: 700;
    color: #0f3460;
    margin: 18px 0 10px;
    padding-bottom: 4px;
    border-bottom: 2px solid rgba(15, 52, 96, 0.12);
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 4px;
  }
  .kpi-card {
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 10px;
    padding: 12px 14px;
    background: #f8fafc;
  }
  .kpi-label { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
  .trend { display: block; font-size: 10px; margin-top: 4px; font-weight: 600; }
  .trend-up { color: #059669; }
  .trend-down { color: #d97706; }
  .a4-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
  .a4-table th {
    text-align: left;
    padding: 8px 10px;
    background: #0f3460;
    color: #fff;
    font-weight: 600;
  }
  .a4-table th.num, .a4-table td.num { text-align: right; }
  .a4-table td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  .a4-table tbody tr:nth-child(even) td { background: #f8fafc; }
  .a4-footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #64748b;
    line-height: 1.5;
  }
  .a4-footer p { margin-bottom: 6px; }
  .a4-note { font-style: italic; color: #94a3b8; margin-bottom: 8px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .a4-page { padding: 0 12mm 10mm; }
  }
`;

export function buildReportA4HTML(snapshot: ReportExportSnapshot, copy: ReportPrintCopy): string {
  const generated = new Date(snapshot.generatedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const logoSrc = snapshot.business.logoUrl
    ? resolveImageUrlForPrint(snapshot.business.logoUrl)
    : "";
  const kpiHtml = snapshot.kpis
    .map(
      (k) => `
    <div class="kpi-card">
      <div class="kpi-label">${escapeHtml(k.label)}</div>
      <div class="kpi-value">${formatPrice(k.value)}</div>
      ${formatTrend(k.trendPct, copy.trendVsPrev)}
    </div>`
    )
    .join("");

  const paymentsHtml =
    snapshot.payments.length > 0
      ? `<table class="a4-table">
      <thead><tr>
        <th>${escapeHtml(copy.colMethod)}</th>
        <th class="num">${escapeHtml(copy.colAmount)}</th>
        <th class="num">${escapeHtml(copy.colPct)}</th>
      </tr></thead>
      <tbody>${snapshot.payments
        .map(
          (p) => `<tr>
        <td>${escapeHtml(p.label)}</td>
        <td class="num">${formatPrice(p.amount)}</td>
        <td class="num">${p.pct}%</td>
      </tr>`
        )
        .join("")}</tbody>
    </table>`
      : `<p class="a4-meta-line">—</p>`;

  const marginHtml = snapshot.margin
    ? `<h2 class="a4-section-title">${escapeHtml(copy.sectionMargin)}</h2>
    <p class="a4-meta-line" style="margin-bottom:8px;font-weight:600;">${formatPrice(snapshot.margin.total)}</p>
    ${
      snapshot.margin.products.length
        ? `<table class="a4-table">
      <thead><tr><th>${escapeHtml(copy.colProduct)}</th><th class="num">${escapeHtml(copy.colMargin)}</th></tr></thead>
      <tbody>${snapshot.margin.products
        .map(
          (p) =>
            `<tr><td>${escapeHtml(p.name)}</td><td class="num">${formatPrice(p.amount)}</td></tr>`
        )
        .join("")}</tbody>
    </table>`
        : ""
    }`
    : "";

  const salesHtml =
    snapshot.sales.length > 0
      ? `<table class="a4-table">
      <thead><tr>
        <th>${escapeHtml(copy.colReceipt)}</th>
        <th>${escapeHtml(copy.colDate)}</th>
        <th>${escapeHtml(copy.colTime)}</th>
        <th class="num">${escapeHtml(copy.colTotal)}</th>
        <th>${escapeHtml(copy.colPayment)}</th>
        <th>${escapeHtml(copy.colStatus)}</th>
      </tr></thead>
      <tbody>${snapshot.sales
        .map(
          (s) => `<tr>
        <td>${escapeHtml(s.receiptNumber)}</td>
        <td>${escapeHtml(s.date)}</td>
        <td>${escapeHtml(s.time)}</td>
        <td class="num">${formatPrice(s.total)}</td>
        <td>${escapeHtml(s.method)}</td>
        <td>${escapeHtml(s.status)}</td>
      </tr>`
        )
        .join("")}</tbody>
    </table>`
      : `<p class="a4-meta-line">—</p>`;

  const excerptNote = snapshot.salesIsExcerpt
    ? `<p class="a4-note">${escapeHtml(copy.salesExcerptNote)}</p>`
    : "";

  const logoHtml =
    logoSrc.length > 0
      ? `<div class="a4-logo-wrap"><img src="${escapeHtml(logoSrc)}" alt="" class="a4-logo-img" /></div>`
      : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(copy.docTitle)} — ${escapeHtml(snapshot.business.name)}</title>
  <style>${REPORT_PRINT_STYLES}</style>
</head>
<body>
  <div class="a4-page">
    <div class="a4-topbar" aria-hidden="true"></div>
    <header class="a4-header">
      <div class="a4-brand">
        <span class="a4-doc-badge">${escapeHtml(copy.docTitle)}</span>
        ${logoHtml}
      </div>
      <div class="a4-meta-block">
        <strong>${escapeHtml(copy.periodLabel)}</strong>
        ${escapeHtml(snapshot.periodRangeSummary)}<br/>
        ${snapshot.storeName ? `${escapeHtml(copy.storeLabel)} ${escapeHtml(snapshot.storeName)}<br/>` : ""}
        ${escapeHtml(copy.generatedLabel)} ${escapeHtml(generated)}
      </div>
    </header>
    <h1 class="a4-shop-name">${escapeHtml(snapshot.business.name)}</h1>
    ${snapshot.business.address ? `<p class="a4-meta-line">${escapeHtml(snapshot.business.address)}</p>` : ""}
    ${snapshot.business.phone ? `<p class="a4-meta-line">${escapeHtml(snapshot.business.phone)}</p>` : ""}

    <h2 class="a4-section-title">${escapeHtml(copy.sectionKpis)}</h2>
    <div class="kpi-grid">${kpiHtml}</div>

    <h2 class="a4-section-title">${escapeHtml(copy.sectionPayments)}</h2>
    ${paymentsHtml}

    ${marginHtml}

    <h2 class="a4-section-title">${escapeHtml(copy.sectionSales)}</h2>
    ${excerptNote}
    ${salesHtml}

    <footer class="a4-footer">
      <p>${escapeHtml(copy.footerDisclaimer)}</p>
      <p>${escapeHtml(copy.thankYou)}</p>
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

export function printReportA4(snapshot: ReportExportSnapshot, copy: ReportPrintCopy): void {
  const html = buildReportA4HTML(snapshot, copy);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error("PRINT_WINDOW_BLOCKED");
  }
  printWindow.focus();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
