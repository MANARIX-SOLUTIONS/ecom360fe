import { describe, it, expect } from "vitest";
import { registerPwa } from "./pwa";

describe("registerPwa", () => {
  it("is a no-op in Vitest (development)", () => {
    expect(() => registerPwa()).not.toThrow();
  });
});
