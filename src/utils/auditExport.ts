import type { AuditLogEntry } from "@/api/backoffice";
import { buildCsv } from "./adminCsv";

export function buildAuditCsv(rows: AuditLogEntry[]): string {
  return buildCsv(
    ["Date", "Action", "Type", "EntityId", "BusinessId", "UserId", "IP", "RequestId"],
    rows.map((row) => [
      row.createdAt,
      row.action,
      row.entityType,
      row.entityId ?? "",
      row.businessId ?? "",
      row.userId ?? "",
      row.ipAddress ?? "",
      row.requestId ?? "",
    ])
  );
}
