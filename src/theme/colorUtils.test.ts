import { describe, expect, it } from "vitest";
import { contrastAgainstWhite, hexToRgba, hoverFromPrimary, parseHex } from "./colorUtils";

describe("parseHex", () => {
  it("parses #RRGGBB", () => {
    expect(parseHex("#0f3460")).toEqual({ r: 15, g: 52, b: 96 });
    expect(parseHex("#0F3460")).toEqual({ r: 15, g: 52, b: 96 });
  });

  it("rejects shorthand and garbage", () => {
    expect(parseHex("#fff")).toBeNull();
    expect(parseHex("navy")).toBeNull();
  });
});

describe("hexToRgba", () => {
  it("keeps alpha", () => {
    expect(hexToRgba("#0f3460", 0.08)).toBe("rgba(15, 52, 96, 0.08)");
  });
});

describe("hoverFromPrimary", () => {
  it("lightens navy toward the default hover", () => {
    const hover = hoverFromPrimary("#0f3460");
    const rgb = parseHex(hover);
    expect(rgb).not.toBeNull();
    expect(rgb!.r).toBeGreaterThan(15);
    expect(rgb!.g).toBeGreaterThan(52);
  });
});

describe("contrastAgainstWhite", () => {
  it("accepts navy and rejects yellow", () => {
    expect(contrastAgainstWhite("#0f3460")).toBeGreaterThan(3);
    expect(contrastAgainstWhite("#ffff00")).toBeLessThan(3);
  });
});
