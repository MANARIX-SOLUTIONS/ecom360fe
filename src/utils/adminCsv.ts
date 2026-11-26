import type {
  AdminInvoice,
  AdminRevenuePoint,
  AdminStats,
  AdminSubscriptionPayment,
} from "@/api/backoffice";

export function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell == null ? "" : String(cell))).join(",")),
  ];
  return lines.join("\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildInvoiceCsv(rows: AdminInvoice[]): string {
  return buildCsv(
    [
      "Number",
      "Business",
      "Amount",
      "Currency",
      "Status",
      "Channel",
      "Provider",
      "Issued",
      "Due",
      "PaidAt",
      "ExternalRef",
    ],
    rows.map((row) => [
      row.number,
      row.businessName,
      row.amount,
      row.currency,
      row.status,
      row.paymentMethod,
      row.provider,
      row.createdAt,
      row.dueDate,
      row.paidAt,
      row.externalRef,
    ])
  );
}

export function buildPaymentCsv(rows: AdminSubscriptionPayment[]): string {
  return buildCsv(
    [
      "IntentId",
      "Business",
      "Plan",
      "Amount",
      "Currency",
      "Status",
      "Provider",
      "Channel",
      "Invoice",
      "ExternalRef",
      "CreatedAt",
      "PaidAt",
    ],
    rows.map((row) => [
      row.intentId,
      row.businessName,
      row.planName ?? row.planSlug,
      row.amount,
      row.currency,
      row.status,
      row.provider,
      row.channel,
      row.invoiceNumber,
      row.externalRef,
      row.createdAt,
      row.paidAt,
    ])
  );
}

export function buildOverviewCsv(stats: AdminStats): string {
  return buildCsv(
    ["Indicateur", "Valeur"],
    [
      ["Entreprises", stats.businessesCount],
      ["Entreprises actives", stats.activeBusinessesCount],
      ["Boutiques", stats.storesCount],
      ["Utilisateurs", stats.usersCount],
      ["Demandes démo en attente", stats.pendingDemoRequestsCount],
      ["MRR", stats.mrr],
      ["Encaissé", stats.saasCollected],
      ["En attente", stats.saasOutstanding],
      ["Paiements échoués", stats.failedPaymentsCount],
      ["CA marchands", stats.monthlyRevenue],
      ["Devise", stats.currency],
    ]
  );
}

export function buildRevenueCsv(points: AdminRevenuePoint[]): string {
  return buildCsv(
    ["Date", "Collected", "Outstanding", "Failed"],
    points.map((point) => [point.date, point.collected, point.outstanding, point.failed])
  );
}
