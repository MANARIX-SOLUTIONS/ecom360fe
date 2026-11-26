import { describe, expect, it } from "vitest";
import { filterAdminSearchPages } from "./adminSearch";

describe("filterAdminSearchPages", () => {
  it("returns every page when the query is empty", () => {
    expect(filterAdminSearchPages("").length).toBeGreaterThan(5);
  });

  it("matches a page by label", () => {
    expect(filterAdminSearchPages("fact").map((page) => page.href)).toEqual([
      "/backoffice/invoices",
    ]);
  });
});
