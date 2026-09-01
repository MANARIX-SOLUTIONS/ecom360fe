import { describe, it, expect } from "vitest";
import { shouldExpireSessionOn401 } from "./network";

describe("shouldExpireSessionOn401", () => {
  it("expires the session when online", () => {
    expect(shouldExpireSessionOn401(false)).toBe(true);
  });

  it("keeps the session when offline", () => {
    expect(shouldExpireSessionOn401(true)).toBe(false);
  });
});
