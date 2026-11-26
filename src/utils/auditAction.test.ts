import { describe, expect, it } from "vitest";
import { formatAuditAction } from "./auditAction";

describe("formatAuditAction", () => {
  it("maps known actions to French labels", () => {
    expect(formatAuditAction("DEMO_REQUEST_APPROVED")).toBe("Démo validée");
    expect(formatAuditAction("FEATURE_FLAG_UPDATE")).toBe("Indicateur modifié");
  });

  it("keeps unknown actions unchanged", () => {
    expect(formatAuditAction("CUSTOM_EVENT")).toBe("CUSTOM_EVENT");
  });
});
