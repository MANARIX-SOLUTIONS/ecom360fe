/** Integer XOF/FCFA amounts as stored by the API. */
export function formatFCFA(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${n.toLocaleString("fr-FR")} F`;
}

export function paymentMethodLabel(method: string | null | undefined): string {
  switch (method) {
    case "cash":
      return "Espèces";
    case "wave":
      return "Wave";
    case "orange_money":
      return "Orange Money";
    case "credit":
      return "Crédit";
    default:
      return method || "—";
  }
}
