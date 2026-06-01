import { describe, expect, it } from "vitest";
import { buildSalesChartData } from "./reportChartData";

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
