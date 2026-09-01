import { describe, it, expect } from "vitest";
import { isPosRuntimeCacheUrl } from "./pwaCache";

describe("isPosRuntimeCacheUrl", () => {
  it("matches POS catalogue GET paths", () => {
    expect(isPosRuntimeCacheUrl({ pathname: "/api/v1/stock/store/abc" })).toBe(true);
    expect(isPosRuntimeCacheUrl({ pathname: "/api/v1/categories" })).toBe(true);
    expect(isPosRuntimeCacheUrl({ pathname: "/api/v1/clients" })).toBe(true);
    expect(isPosRuntimeCacheUrl({ pathname: "/api/v1/stores" })).toBe(true);
    expect(isPosRuntimeCacheUrl({ pathname: "/api/v1/stores/" })).toBe(true);
  });

  it("ignores mutations and unrelated APIs", () => {
    expect(isPosRuntimeCacheUrl({ pathname: "/api/v1/sales" })).toBe(false);
    expect(isPosRuntimeCacheUrl({ pathname: "/api/v1/auth/refresh" })).toBe(false);
    expect(isPosRuntimeCacheUrl({ pathname: "/api/v1/stores/abc" })).toBe(false);
  });
});
