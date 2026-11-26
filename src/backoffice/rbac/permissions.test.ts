import { describe, expect, it } from "vitest";
import { resolveBackofficeRole, roleCan } from "./permissions";
import { visibleNav } from "../nav";

describe("backoffice roles", () => {
  it("maps the platform admin to super admin", () => {
    expect(resolveBackofficeRole("PLATFORM_ADMIN")).toBe("super_admin");
    expect(roleCan("super_admin", "settings.write")).toBe(true);
    expect(roleCan("super_admin", "impersonate")).toBe(true);
  });

  it("keeps finance away from tenant administration and pricing edits", () => {
    expect(roleCan("finance", "payments.read")).toBe(true);
    expect(roleCan("finance", "plans.read")).toBe(true);
    expect(roleCan("finance", "plans.write")).toBe(false);
    expect(roleCan("finance", "tenants.suspend")).toBe(false);
    expect(roleCan("finance", "team.read")).toBe(false);
  });

  it("lets support read tenants and impersonate, without pricing", () => {
    expect(roleCan("support", "tenants.read")).toBe(true);
    expect(roleCan("support", "tenants.notes")).toBe(true);
    expect(roleCan("support", "tenants.write")).toBe(false);
    expect(roleCan("support", "users.reset")).toBe(true);
    expect(roleCan("support", "impersonate")).toBe(true);
    expect(roleCan("support", "plans.read")).toBe(false);
  });

  it("gives read only every read permission except settings", () => {
    expect(roleCan("readonly", "audit.read")).toBe(true);
    expect(roleCan("readonly", "settings.read")).toBe(false);
    expect(roleCan("readonly", "tenants.write")).toBe(false);
  });

  it("hides revenue navigation from ops", () => {
    const hrefs = visibleNav((permission) => roleCan("ops", permission)).flatMap((group) =>
      group.items.map((item) => item.href)
    );
    expect(hrefs).toContain("/backoffice/businesses");
    expect(hrefs).not.toContain("/backoffice/payments");
    expect(hrefs).not.toContain("/backoffice/plans");
  });
});
