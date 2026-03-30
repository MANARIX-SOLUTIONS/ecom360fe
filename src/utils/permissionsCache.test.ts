import { describe, it, expect, beforeEach } from "vitest";
import { PERMISSIONS_CACHE_KEY } from "@/constants/storageKeys";
import {
  readPermissionsBundle,
  shouldSkipPermissionsRefetch,
  writePermissionsBundle,
} from "./permissionsCache";

describe("permissionsCache", () => {
  beforeEach(() => {
    localStorage.removeItem(PERMISSIONS_CACHE_KEY);
  });

  it("shouldSkipPermissionsRefetch is false without cache", () => {
    expect(shouldSkipPermissionsRefetch()).toBe(false);
  });

  it("shouldSkipPermissionsRefetch is true just after write", () => {
    writePermissionsBundle({
      permissions: ["PRODUCTS_READ"],
      navigationRules: { products: ["PRODUCTS_READ"] },
      role: "proprietaire",
    });
    expect(shouldSkipPermissionsRefetch()).toBe(true);
  });

  it("readPermissionsBundle returns bundle with fetchedAt", () => {
    writePermissionsBundle({
      permissions: ["X"],
      navigationRules: {},
      role: null,
    });
    const b = readPermissionsBundle();
    expect(b?.permissions).toEqual(["X"]);
    expect(b?.fetchedAt).toBeTypeOf("number");
  });
});
