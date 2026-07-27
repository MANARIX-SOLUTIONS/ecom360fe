import { describe, expect, it } from "vitest";
import { buildPeriodChartData, buildSalesChartData } from "./reportChartData";

const sales = [
  { createdAt: "2026-01-05T10:00:00.000Z", total: 1000 },
  { createdAt: "2026-01-07T10:00:00.000Z", total: 2000 },
  { createdAt: "2026-02-10T10:00:00.000Z", total: 3000 },
];

describe("buildSalesChartData", () => {
  it("aggregates by day for short ranges", () => {
    const janSales = sales.filter((s) => s.createdAt.startsWith("2026-01"));
    const points = buildSalesChartData(janSales, "2026-01-01", "2026-01-31");
    expect(points).toHaveLength(2);
    expect(points[0].ventes).toBe(1000);
    expect(points[1].ventes).toBe(2000);
  });

  it("aggregates by month for long ranges", () => {
    const points = buildSalesChartData(sales, "2026-01-01", "2026-12-31");
    expect(points).toHaveLength(2);
    expect(points[0].ventes).toBe(3000);
    expect(points[1].ventes).toBe(3000);
  });
});

describe("buildPeriodChartData", () => {
  it("merges daily sales and expenses into buckets", () => {
    const points = buildPeriodChartData(
      [
        { date: "2026-01-05", amount: 1000 },
        { date: "2026-01-07", amount: 2000 },
      ],
      [
        { date: "2026-01-05", amount: 400 },
        { date: "2026-01-06", amount: 100 },
      ],
      "2026-01-01",
      "2026-01-31"
    );
    expect(points).toHaveLength(3);
    const jan5 = points.find((p) => p.name === "01-05");
    const jan6 = points.find((p) => p.name === "01-06");
    const jan7 = points.find((p) => p.name === "01-07");
    expect(jan5).toEqual({ name: "01-05", ventes: 1000, dépenses: 400 });
    expect(jan6).toEqual({ name: "01-06", ventes: 0, dépenses: 100 });
    expect(jan7).toEqual({ name: "01-07", ventes: 2000, dépenses: 0 });
  });

  it("returns empty when both series are empty", () => {
    expect(buildPeriodChartData([], [], "2026-01-01", "2026-01-31")).toEqual([]);
  });
});
