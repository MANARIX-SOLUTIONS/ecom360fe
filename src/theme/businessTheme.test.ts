import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ACCENT,
  DEFAULT_PRIMARY,
  applyThemeCssVars,
  clearThemeCssVars,
  isPlatformDefaultTheme,
  matchingPaletteId,
  resolveThemeColors,
} from "./businessTheme";

describe("resolveThemeColors", () => {
  it("falls back to platform navy/cyan", () => {
    const c = resolveThemeColors(null, null);
    expect(c.primary).toBe(DEFAULT_PRIMARY);
    expect(c.accent).toBe(DEFAULT_ACCENT);
  });

  it("uses custom hex", () => {
    const c = resolveThemeColors("#166534", "#10b981");
    expect(c.primary).toBe("#166534");
    expect(c.accent).toBe("#10b981");
    expect(c.primarySoft).toContain("22, 101, 52");
  });
});

describe("matchingPaletteId", () => {
  it("detects navy as default", () => {
    expect(matchingPaletteId(null, null)).toBe("navy");
    expect(isPlatformDefaultTheme(null, null)).toBe(true);
    expect(matchingPaletteId("#166534", "#10b981")).toBe("forest");
    expect(matchingPaletteId("#111111", "#222222")).toBeNull();
  });
});

describe("applyThemeCssVars", () => {
  afterEach(() => {
    clearThemeCssVars();
  });

  it("writes and clears v2 custom properties", () => {
    const root = document.documentElement;
    applyThemeCssVars(resolveThemeColors("#166534", "#10b981"), root);
    expect(root.style.getPropertyValue("--v2-primary")).toBe("#166534");
    expect(root.style.getPropertyValue("--v2-accent")).toBe("#10b981");
    clearThemeCssVars(root);
    expect(root.style.getPropertyValue("--v2-primary")).toBe("");
  });
});
