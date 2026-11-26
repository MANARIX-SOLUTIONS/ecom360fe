import { describe, expect, it } from "vitest";
import { TENANTS } from "./demo-data";
import { monthlyAmount } from "./model";

describe("backoffice v2 metrics", () => {
  it("excludes demo tenants from MRR and keeps paying plans", () => {
    const real = TENANTS.filter((tenant) => !tenant.isDemo);
    const demos = TENANTS.filter((tenant) => tenant.isDemo);
    const mrr = real.reduce((sum, tenant) => sum + monthlyAmount(tenant), 0);

    expect(demos.map((tenant) => tenant.name).sort()).toEqual(["Demo Commerce", "Ecommerce"]);
    expect(demos.every((tenant) => monthlyAmount(tenant) === 0)).toBe(true);
    expect(mrr).toBeGreaterThan(850000);
    expect(mrr).toBeLessThan(950000);
    expect(real.find((tenant) => tenant.name === "Muka")?.renewal).toBe("2026-11-03");
    expect(real.find((tenant) => tenant.id === "garage-sow")?.status).toBe("impaye");
  });
});
