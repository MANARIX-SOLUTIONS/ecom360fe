/**
 * Export rapport au format .xlsx (SheetJS).
 */

import type { ReportExportSnapshot } from "@/utils/reportExport";
import { reportExportBaseFilename } from "@/utils/reportExport";

export type ReportWorkbookCopy = {
  sheetSummary: string;
  sheetPayments: string;
  sheetSales: string;
  sheetMargin: string;
  headerBusiness: string;
  headerPeriod: string;
  headerGenerated: string;
  headerStore: string;
  colIndicator: string;
  colValue: string;
  colTrend: string;
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
  marginTotalLabel: string;
  salesExcerptNote: string;
  productBrand: string;
};

function trendLabel(pct: number | null): string {
  if (pct === null) return "";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

export function buildReportWorkbookAoA(
  snapshot: ReportExportSnapshot,
  copy: ReportWorkbookCopy
): {
  summary: (string | number)[][];
  payments: (string | number)[][];
  sales: (string | number)[][];
  margin?: (string | number)[][];
} {
  const generated = new Date(snapshot.generatedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const summary: (string | number)[][] = [
    [copy.productBrand],
    [copy.headerBusiness, snapshot.business.name],
    [copy.headerStore, snapshot.storeName ?? "—"],
    [copy.headerPeriod, snapshot.periodRangeSummary],
    [copy.headerGenerated, generated],
    [],
    [copy.colIndicator, copy.colValue, copy.colTrend],
    ...snapshot.kpis.map((k) => [k.label, k.value, trendLabel(k.trendPct)]),
  ];

  const payments: (string | number)[][] = [
    [copy.colMethod, copy.colAmount, copy.colPct],
    ...snapshot.payments.map((p) => [p.label, p.amount, p.pct]),
  ];

  const sales: (string | number)[][] = [
    ...(snapshot.salesIsExcerpt ? [[copy.salesExcerptNote], []] : []),
    [copy.colReceipt, copy.colDate, copy.colTime, copy.colTotal, copy.colPayment, copy.colStatus],
    ...snapshot.sales.map((s) => [s.receiptNumber, s.date, s.time, s.total, s.method, s.status]),
  ];

  let margin: (string | number)[][] | undefined;
  if (snapshot.margin) {
    margin = [
      [copy.colIndicator, copy.colValue],
      [copy.marginTotalLabel, snapshot.margin.total],
      [],
      [copy.colProduct, copy.colMargin],
      ...snapshot.margin.products.map((p) => [p.name, p.amount]),
    ];
  }

  return { summary, payments, sales, margin };
}

export async function downloadReportWorkbook(
  snapshot: ReportExportSnapshot,
  copy: ReportWorkbookCopy
): Promise<void> {
  const XLSX = await import("xlsx");
  const sheets = buildReportWorkbookAoA(snapshot, copy);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(sheets.summary),
    copy.sheetSummary.slice(0, 31)
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(sheets.payments),
    copy.sheetPayments.slice(0, 31)
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(sheets.sales),
    copy.sheetSales.slice(0, 31)
  );
  if (sheets.margin) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(sheets.margin),
      copy.sheetMargin.slice(0, 31)
    );
  }

  const filename = `${reportExportBaseFilename(snapshot)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
