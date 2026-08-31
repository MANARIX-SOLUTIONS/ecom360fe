/**
 * Affichage et règles UI du solde crédit.
 * Solde positif = le client doit ; négatif = trop-perçu.
 */
export type CreditBalanceTone = "warning" | "success" | "default";

export function creditBalanceTagColor(balance: number): CreditBalanceTone {
  if (balance > 0) return "warning";
  if (balance < 0) return "success";
  return "default";
}

export function creditBalanceCssVar(balance: number): string {
  if (balance > 0) return "var(--color-warning)";
  if (balance < 0) return "var(--color-success)";
  return "var(--color-text)";
}

export function canRecordClientPayment(opts: {
  canClientCredits: boolean;
  balance: number;
  isWalkIn: boolean;
}): boolean {
  return opts.canClientCredits && opts.balance > 0 && !opts.isWalkIn;
}
