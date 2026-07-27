import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import {
  buildPaymentRowsFromBreakdown,
  buildPaymentRowsFromSales,
  buildReportExportSnapshot,
  filterSalesInPeriod,
  getReportPeriodLabel,
  reportExportBaseFilename,
  slugifyExportFilenamePart,
} from "./reportExport";
import type { DashboardResponse } from "@/api/dashboard";

const baseDashboard: DashboardResponse = {
  todaySalesCount: 2,
  todayRevenue: 10000,
  periodSalesCount: 5,
  periodRevenue: 50000,
  periodExpenses: 12000,
  periodProfit: 38000,
  totalProducts: 10,
  totalClients: 3,
  totalSuppliers: 1,
  totalStores: 1,
  lowStockItems: [],
  recentSales: [
    {
      saleId: "1",
      receiptNumber: "T-001",
      total: 20000,
      paymentMethod: "cash",
      status: "completed",
      createdAt: "2026-05-10T10:00:00.000Z",
    },
    {
      saleId: "2",
      receiptNumber: "T-002",
      total: 15000,
      paymentMethod: "credit",
      status: "completed",
      createdAt: "2026-05-12T14:30:00.000Z",
    },
    {
      saleId: "3",
      receiptNumber: "T-003",
      total: 5000,
      paymentMethod: "wave",
      status: "voided",
      createdAt: "2026-05-01T09:00:00.000Z",
    },
  ],
  topProducts: [],
  analyticsLimitedToToday: false,
  periodGrossMargin: 8000,
  topMarginProducts: [{ productId: "p1", productName: "Produit A", marginAmount: 5000 }],
  businessCreatedAt: null,
  previousPeriodRevenue: 40000,
  previousPeriodExpenses: 10000,
  previousPeriodProfit: 30000,
  previousPeriodSalesCount: 4,
};

const labels = {
  kpiRevenue: "Ventes",
  kpiExpenses: "Dépenses",
  kpiProfit: "Résultat net",
  kpiTransactions: "Transactions",
  kpiGrossMargin: "Marge brute",
  productBrand: "360 PME",
};

describe("reportExport", () => {
  it("filterSalesInPeriod keeps only sales in range", () => {
    const filtered = filterSalesInPeriod(baseDashboard.recentSales, "2026-05-10", "2026-05-15");
    expect(filtered).toHaveLength(2);
    expect(filtered.map((s) => s.receiptNumber)).toEqual(["T-001", "T-002"]);
  });

  it("buildPaymentRowsFromSales aggregates amounts and pct", () => {
    const rows = buildPaymentRowsFromSales(
      filterSalesInPeriod(baseDashboard.recentSales, "2026-05-10", "2026-05-15")
    );
    expect(rows).toHaveLength(2);
    const cash = rows.find((r) => r.label === "Espèces");
    const credit = rows.find((r) => r.label === "Crédit");
    expect(cash?.amount).toBe(20000);
    expect(credit?.amount).toBe(15000);
    expect(cash!.pct + credit!.pct).toBe(100);
  });

  it("buildPaymentRowsFromBreakdown uses period totals from API", () => {
    const rows = buildPaymentRowsFromBreakdown([
      { method: "cash", amount: 40000 },
      { method: "wave", amount: 10000 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe("Espèces");
    expect(rows[0].amount).toBe(40000);
    expect(rows[0].pct).toBe(80);
    expect(rows[1].label).toBe("Wave");
    expect(rows[1].pct).toBe(20);
  });

  it("buildReportExportSnapshot prefers periodPaymentBreakdown over recentSales", () => {
    const snap = buildReportExportSnapshot({
      data: {
        ...baseDashboard,
        periodPaymentBreakdown: [
          { method: "orange_money", amount: 30000 },
          { method: "cash", amount: 20000 },
        ],
      },
      periodRange: { start: "2026-05-10", end: "2026-05-15" },
      periodLabel: "Cette semaine",
      business: { name: "Boutique Test" },
      storeName: "Dakar Centre",
      labels,
    });
    expect(snap.payments).toHaveLength(2);
    expect(snap.payments[0].label).toBe("Orange Money");
    expect(snap.payments[0].amount).toBe(30000);
    expect(snap.payments[1].label).toBe("Espèces");
  });

  it("buildReportExportSnapshot includes kpis, margin and excerpt flag", () => {
    const snap = buildReportExportSnapshot({
      data: baseDashboard,
      periodRange: { start: "2026-05-10", end: "2026-05-15" },
      periodLabel: "Cette semaine",
      business: { name: "Boutique Test" },
      storeName: "Dakar Centre",
      labels,
      includeGrossMargin: true,
    });
    expect(snap.kpis).toHaveLength(5);
    expect(snap.kpis[0].value).toBe(50000);
    expect(snap.kpis[0].trendPct).toBe(25);
    expect(snap.margin?.total).toBe(8000);
    expect(snap.margin?.products).toHaveLength(1);
    expect(snap.sales).toHaveLength(2);
    expect(snap.salesIsExcerpt).toBe(true);
  });

  it("getReportPeriodLabel formats quarter and year", () => {
    const anchors = {
      selectedMonth: dayjs("2026-03-01"),
      selectedQuarter: dayjs("2026-04-01"),
      selectedYear: dayjs("2025-01-01"),
    };
    expect(getReportPeriodLabel("quarter", anchors)).toBe("T2 2026");
    expect(getReportPeriodLabel("year", anchors)).toBe("2025");
  });

  it("slugifyExportFilenamePart normalizes store names", () => {
    expect(slugifyExportFilenamePart("Dakar Centre!")).toBe("dakar-centre");
  });

  it("reportExportBaseFilename uses period bounds", () => {
    const snap = buildReportExportSnapshot({
      data: baseDashboard,
      periodRange: { start: "2026-05-01", end: "2026-05-15" },
      periodLabel: "Ce mois",
      business: { name: "Test" },
      labels,
    });
    expect(reportExportBaseFilename(snap)).toBe("rapport-boutique-2026-05-01-2026-05-15");
  });
});
