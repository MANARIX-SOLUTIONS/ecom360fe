import { describe, it, expect } from "vitest";
import { buildReportWorkbookAoA } from "./buildReportWorkbook";
import type { ReportExportSnapshot } from "./reportExport";

const snapshot: ReportExportSnapshot = {
  generatedAt: "2026-05-15T12:00:00.000Z",
  business: { name: "Test SARL" },
  storeName: "Shop",
  periodLabel: "Semaine",
  periodRangeSummary: "10 – 15 mai 2026",
  periodStart: "2026-05-10",
  periodEnd: "2026-05-15",
  kpis: [
    { label: "Ventes", value: 1000, trendPct: 10 },
    { label: "Dépenses", value: 200, trendPct: -5 },
  ],
  payments: [{ label: "Espèces", amount: 800, pct: 80 }],
  sales: [
    {
      receiptNumber: "R1",
      date: "2026-05-10",
      time: "10:00",
      total: 800,
      method: "Espèces",
      status: "Terminée",
    },
  ],
  salesIsExcerpt: false,
};

const copy = {
  sheetSummary: "Résumé",
  sheetPayments: "Paiements",
  sheetSales: "Ventes",
  sheetMargin: "Marge",
  headerBusiness: "Entreprise",
  headerPeriod: "Période",
  headerGenerated: "Généré",
  headerStore: "Boutique",
  colIndicator: "Indicateur",
  colValue: "Valeur",
  colTrend: "Évolution",
  colMethod: "Mode",
  colAmount: "Montant",
  colPct: "Part",
  colReceipt: "Ticket",
  colDate: "Date",
  colTime: "Heure",
  colTotal: "Total",
  colPayment: "Paiement",
  colStatus: "Statut",
  colProduct: "Produit",
  colMargin: "Marge",
  marginTotalLabel: "Marge brute",
  salesExcerptNote: "Extrait",
  productBrand: "360",
};

describe("buildReportWorkbookAoA", () => {
  it("builds summary, payments and sales sheets with headers", () => {
    const sheets = buildReportWorkbookAoA(snapshot, copy);
    expect(sheets.summary[0][0]).toBe("360");
    expect(sheets.summary[6]).toEqual(["Indicateur", "Valeur", "Évolution"]);
    expect(sheets.summary[7]).toEqual(["Ventes", 1000, "+10%"]);
    expect(sheets.payments[0]).toEqual(["Mode", "Montant", "Part"]);
    expect(sheets.sales[0]).toEqual(["Ticket", "Date", "Heure", "Total", "Paiement", "Statut"]);
    expect(sheets.margin).toBeUndefined();
  });

  it("includes margin sheet when snapshot has margin", () => {
    const withMargin: ReportExportSnapshot = {
      ...snapshot,
      margin: { total: 400, products: [{ name: "A", amount: 400 }] },
    };
    const sheets = buildReportWorkbookAoA(withMargin, copy);
    expect(sheets.margin).toBeDefined();
    expect(sheets.margin![0]).toEqual(["Indicateur", "Valeur"]);
  });
});
