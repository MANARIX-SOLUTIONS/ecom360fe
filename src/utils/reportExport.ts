/**
 * Snapshot partagé pour exports PDF / Excel des rapports.
 */

import type { DashboardResponse } from "@/api/dashboard";
import { formatRangeSummaryFr, isYmdInInclusiveRange } from "@/utils/dateLocal";
import { pctChangeVsPrevious } from "@/utils/kpiDelta";

export const REPORT_PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  credit: "Crédit",
};

export type ReportExportKpi = {
  label: string;
  value: number;
  trendPct: number | null;
};

export type ReportExportPaymentRow = {
  label: string;
  amount: number;
  pct: number;
};

export type ReportExportSaleRow = {
  receiptNumber: string;
  date: string;
  time: string;
  total: number;
  method: string;
  status: string;
};

export type ReportExportSnapshot = {
  generatedAt: string;
  business: {
    name: string;
    address?: string;
    phone?: string;
    logoUrl?: string;
  };
  storeName?: string;
  periodLabel: string;
  periodRangeSummary: string;
  periodStart: string;
  periodEnd: string;
  kpis: ReportExportKpi[];
  payments: ReportExportPaymentRow[];
  margin?: {
    total: number;
    products: { name: string; amount: number }[];
  };
  sales: ReportExportSaleRow[];
  /** Ventes listées = extrait API (recentSales), pas forcément toute la période. */
  salesIsExcerpt: boolean;
};

export type ReportExportLabels = {
  kpiRevenue: string;
  kpiExpenses: string;
  kpiProfit: string;
  kpiTransactions: string;
  kpiGrossMargin: string;
  productBrand: string;
};

function formatSaleTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function saleStatusLabel(status: string): string {
  return status === "voided" ? "Annulée" : "Terminée";
}

export function buildPaymentRowsFromSales(
  sales: { paymentMethod?: string; total: number }[]
): ReportExportPaymentRow[] {
  const byMethod: Record<string, number> = {};
  let total = 0;
  for (const s of sales) {
    const m = s.paymentMethod || "cash";
    byMethod[m] = (byMethod[m] || 0) + s.total;
    total += s.total;
  }
  if (total === 0) return [];
  return Object.entries(byMethod)
    .map(([method, amount]) => ({
      label: REPORT_PAYMENT_LABELS[method] || method,
      amount,
      pct: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function filterSalesInPeriod(
  recentSales: DashboardResponse["recentSales"],
  periodStart: string,
  periodEnd: string
): DashboardResponse["recentSales"] {
  if (!recentSales?.length) return [];
  return recentSales.filter((s) =>
    isYmdInInclusiveRange(s.createdAt.slice(0, 10), periodStart, periodEnd)
  );
}

export function buildReportExportSnapshot(params: {
  data: DashboardResponse;
  periodRange: { start: string; end: string };
  periodLabel: string;
  business: {
    name: string;
    address?: string;
    phone?: string;
    logoUrl?: string | null;
  };
  storeName?: string;
  labels: ReportExportLabels;
  includeGrossMargin?: boolean;
}): ReportExportSnapshot {
  const { data, periodRange, periodLabel, business, storeName, labels, includeGrossMargin } =
    params;

  const salesFiltered = filterSalesInPeriod(data.recentSales, periodRange.start, periodRange.end);

  const kpis: ReportExportKpi[] = [
    {
      label: labels.kpiRevenue,
      value: data.periodRevenue,
      trendPct: pctChangeVsPrevious(data.periodRevenue, data.previousPeriodRevenue),
    },
    {
      label: labels.kpiExpenses,
      value: data.periodExpenses,
      trendPct: pctChangeVsPrevious(data.periodExpenses, data.previousPeriodExpenses),
    },
    {
      label: labels.kpiProfit,
      value: data.periodProfit,
      trendPct: pctChangeVsPrevious(data.periodProfit, data.previousPeriodProfit),
    },
    {
      label: labels.kpiTransactions,
      value: data.periodSalesCount,
      trendPct: pctChangeVsPrevious(data.periodSalesCount, data.previousPeriodSalesCount),
    },
  ];

  if (includeGrossMargin && data.periodGrossMargin != null) {
    kpis.push({
      label: labels.kpiGrossMargin,
      value: data.periodGrossMargin,
      trendPct: null,
    });
  }

  const payments = buildPaymentRowsFromSales(salesFiltered);

  const sales: ReportExportSaleRow[] = salesFiltered.map((s) => ({
    receiptNumber: s.receiptNumber,
    date: s.createdAt.slice(0, 10),
    time: formatSaleTime(s.createdAt),
    total: s.total,
    method: REPORT_PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod || "—",
    status: saleStatusLabel(s.status ?? "completed"),
  }));

  const salesIsExcerpt = data.periodSalesCount > 0 && salesFiltered.length < data.periodSalesCount;

  let margin: ReportExportSnapshot["margin"];
  if (data.periodGrossMargin != null) {
    margin = {
      total: data.periodGrossMargin,
      products: (data.topMarginProducts ?? []).map((p) => ({
        name: p.productName,
        amount: p.marginAmount,
      })),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    business: {
      name: business.name,
      address: business.address,
      phone: business.phone,
      logoUrl: business.logoUrl ?? undefined,
    },
    storeName,
    periodLabel,
    periodRangeSummary: formatRangeSummaryFr(periodRange.start, periodRange.end),
    periodStart: periodRange.start,
    periodEnd: periodRange.end,
    kpis,
    payments,
    margin,
    sales,
    salesIsExcerpt,
  };
}

export function getReportPeriodLabel(
  tab: "today" | "week" | "month" | "customMonth",
  selectedMonth: { year: () => number; month: () => number }
): string {
  if (tab === "today") return "Aujourd'hui";
  if (tab === "week") return "Cette semaine";
  if (tab === "month") return "Ce mois";
  return new Date(selectedMonth.year(), selectedMonth.month(), 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export function slugifyExportFilenamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .toLowerCase();
}

export function reportExportBaseFilename(snapshot: ReportExportSnapshot): string {
  const store = snapshot.storeName ? slugifyExportFilenamePart(snapshot.storeName) : "boutique";
  return `rapport-${store}-${snapshot.periodStart}-${snapshot.periodEnd}`;
}
