import { describe, it, expect, beforeEach } from "vitest";
import {
  getOnboardingStatus,
  setOnboardingStatus,
  isWithinOnboardingWindow,
} from "./onboardingStorage";

describe("onboardingStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists done per business id", () => {
    setOnboardingStatus("biz-a", "done");
    expect(getOnboardingStatus("biz-a")).toBe("done");
    expect(getOnboardingStatus("biz-b")).toBe(null);
  });

  it("isWithinOnboardingWindow respects 14 days", () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinOnboardingWindow(recent)).toBe(true);
    expect(isWithinOnboardingWindow(old)).toBe(false);
    expect(isWithinOnboardingWindow("not-a-date")).toBe(false);
  });
});
