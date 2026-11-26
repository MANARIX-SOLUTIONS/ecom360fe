import { describe, expect, it } from "vitest";
import { buildCsv, buildInvoiceCsv, buildOverviewCsv, escapeCsv } from "./adminCsv";

describe("adminCsv", () => {
  it("escapes quotes and commas", () => {
    expect(escapeCsv('A, "B"')).toBe('"A, ""B"""');
  });

  it("builds a header plus rows", () => {
    const csv = buildCsv(["Name", "Amount"], [["Boutique, Nord", 1200]]);
    expect(csv).toBe('Name,Amount\n"Boutique, Nord",1200');
  });

  it("exports invoice fields used by support", () => {
    const csv = buildInvoiceCsv([
      {
        id: "inv-1",
        number: "F-100",
        businessId: "biz-1",
        businessName: "Boutique Nord",
        subscriptionId: "sub-1",
        amount: 15000,
        currency: "XOF",
        status: "paid",
        paymentMethod: "wave",
        provider: "wave",
        externalRef: "ref-1",
        paymentIntentId: "int-1",
        dueDate: "2026-10-01",
        paidAt: "2026-10-01T10:00:00Z",
        createdAt: "2026-09-01T10:00:00Z",
      },
    ]);
    expect(csv).toContain("Number,Business,Amount");
    expect(csv).toContain("F-100");
    expect(csv).toContain("Boutique Nord");
    expect(csv).toContain("15000");
  });

  it("exports overview KPIs without inventing metrics", () => {
    const csv = buildOverviewCsv({
      businessesCount: 12,
      usersCount: 40,
      storesCount: 18,
      monthlyRevenue: 1000,
      planDistribution: [],
      topBusinesses: [],
      pendingDemoRequestsCount: 3,
      mrr: 25000,
      saasCollected: 15000,
      currency: "XOF",
    });
    expect(csv).toContain("Demandes démo en attente,3");
    expect(csv).toContain("MRR,25000");
    expect(csv).not.toContain("CPU");
  });
});
