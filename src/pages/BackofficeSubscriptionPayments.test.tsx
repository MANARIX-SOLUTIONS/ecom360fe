import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "antd";
import BackofficeSubscriptionPayments from "./BackofficeSubscriptionPayments";

vi.mock("@/api/backoffice", () => ({
  listAdminSubscriptionPayments: vi.fn(),
  markAdminSubscriptionPaymentPaid: vi.fn(),
}));

import { listAdminSubscriptionPayments } from "@/api/backoffice";

describe("BackofficeSubscriptionPayments", () => {
  beforeEach(() => {
    vi.mocked(listAdminSubscriptionPayments).mockResolvedValue({
      content: [
        {
          intentId: "pay-1",
          businessId: "biz-1",
          businessName: "Boutique Awa",
          planId: "plan-1",
          planSlug: "pro",
          planName: "Pro",
          billingCycle: "monthly",
          amount: 15000,
          currency: "XOF",
          provider: "paydunya",
          channel: "wave",
          status: "failed",
          createdAt: new Date().toISOString(),
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
  });

  it("renders payment statuses from the backend", async () => {
    render(
      <MemoryRouter>
        <App>
          <BackofficeSubscriptionPayments />
        </App>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Paiements abonnements")).toBeInTheDocument();
      expect(screen.getByText("Boutique Awa")).toBeInTheDocument();
      expect(screen.getByText("Échoué")).toBeInTheDocument();
    });
  });
});
