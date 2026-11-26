import { describe, expect, it } from "vitest";
import { buildAuditCsv } from "./auditExport";

describe("buildAuditCsv", () => {
  it("exports the current filter result as CSV", () => {
    const csv = buildAuditCsv([
      {
        id: "1",
        action: "FEATURE_FLAG_UPDATE",
        entityType: "FeatureFlag",
        entityId: "flag-1",
        businessId: null,
        userId: "admin-1",
        ipAddress: "127.0.0.1",
        requestId: "req-1",
        createdAt: "2026-10-08T10:00:00Z",
        changes: null,
      },
    ]);
    expect(csv).toContain("Date,Action,Type");
    expect(csv).toContain("FEATURE_FLAG_UPDATE");
    expect(csv).toContain("FeatureFlag");
    expect(csv).toContain("req-1");
  });
});
