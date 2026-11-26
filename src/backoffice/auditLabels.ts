import { getAdminBusiness, getAdminUser } from "@/api/backoffice";

export type AuditNameIndex = {
  users: Record<string, string>;
  businesses: Record<string, string>;
};

const EMPTY: AuditNameIndex = { users: {}, businesses: {} };

/**
 * Resolves actor and company names for the current audit page.
 * Missing records stay unresolved — callers show a copyable id, never a guessed name.
 */
export async function resolveAuditNames(
  rows: { userId?: string | null; businessId?: string | null }[]
): Promise<AuditNameIndex> {
  const userIds = [
    ...new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id))),
  ];
  const businessIds = [
    ...new Set(rows.map((row) => row.businessId).filter((id): id is string => Boolean(id))),
  ];
  if (userIds.length === 0 && businessIds.length === 0) return EMPTY;

  const users: Record<string, string> = {};
  const businesses: Record<string, string> = {};
  await Promise.allSettled([
    ...userIds.map(async (id) => {
      const user = await getAdminUser(id);
      const label = user.name?.trim() || user.email?.trim();
      if (label) users[id] = label;
    }),
    ...businessIds.map(async (id) => {
      const business = await getAdminBusiness(id);
      if (business.name?.trim()) businesses[id] = business.name.trim();
    }),
  ]);
  return { users, businesses };
}

export function labelFromChanges(
  changes: Record<string, unknown> | null | undefined
): string | null {
  if (!changes) return null;
  for (const key of ["name", "businessName", "fullName", "email"]) {
    const value = changes[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
