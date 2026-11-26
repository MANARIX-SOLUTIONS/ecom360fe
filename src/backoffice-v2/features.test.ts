import { describe, expect, it } from "vitest";
import { SEED_FEATURE_OVERRIDES } from "./demo-data";
import { isFeatureEnabled, planIncludesFeature } from "./model";

describe("enterprise feature exceptions", () => {
  it("follows the plan unless an enterprise exception says otherwise", () => {
    expect(planIncludesFeature("starter", "client_credits")).toBe(false);
    expect(planIncludesFeature("pro", "role_management")).toBe(false);
    expect(planIncludesFeature("business", "pos_online_payment")).toBe(true);

    expect(
      isFeatureEnabled("starter", "client_credits", SEED_FEATURE_OVERRIDES, "epi-medina")
    ).toBe(true);
    expect(
      isFeatureEnabled("starter", "client_credits", SEED_FEATURE_OVERRIDES, "mode-thies")
    ).toBe(false);
    expect(isFeatureEnabled("pro", "role_management", SEED_FEATURE_OVERRIDES, "salon-bintou")).toBe(
      true
    );
    expect(
      isFeatureEnabled("business", "pos_online_payment", SEED_FEATURE_OVERRIDES, "garage-sow")
    ).toBe(false);
    expect(isFeatureEnabled("business", "pos_online_payment", SEED_FEATURE_OVERRIDES, "muka")).toBe(
      true
    );
  });
});
