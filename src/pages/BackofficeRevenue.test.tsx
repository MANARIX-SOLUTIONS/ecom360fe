import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BackofficeRevenue from "./BackofficeRevenue";

vi.mock("@/api/backoffice", () => ({
  getAdminStats: vi.fn(),
  getAdminRevenue: vi.fn(),
}));

import { getAdminRevenue, getAdminStats } from "@/api/backoffice";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("BackofficeRevenue", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(getAdminRevenue).mockResolvedValue({
      currency: "XOF",
      periodFrom: new Date().toISOString(),
      periodTo: new Date().toISOString(),
      points: [{ date: "2026-10-01", collected: 1000, outstanding: 0, failed: 200 }],
    });
  });

  it("shows a failed-payment rate only when attempts exist", async () => {
    vi.mocked(getAdminStats).mockResolvedValue({
      businessesCount: 2,
      usersCount: 4,
      storesCount: 3,
      monthlyRevenue: 0,
      planDistribution: [{ plan: "Pro", count: 2, pct: 100 }],
      topBusinesses: [],
      mrr: 25000,
      saasCollected: 10000,
      saasOutstanding: 500,
      failedPaymentsCount: 1,
      paymentAttemptsCount: 4,
      currency: "XOF",
    });

    render(
      <MemoryRouter>
        <BackofficeRevenue />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Analytique revenus")).toBeInTheDocument();
      expect(screen.getByText("25.0 %")).toBeInTheDocument();
    });
  });

  it("keeps the rate unavailable when the backend has no attempts", async () => {
    vi.mocked(getAdminRevenue).mockResolvedValue({
      currency: "XOF",
      periodFrom: new Date().toISOString(),
      periodTo: new Date().toISOString(),
      points: [],
    });
    vi.mocked(getAdminStats).mockResolvedValue({
      businessesCount: 0,
      usersCount: 0,
      storesCount: 0,
      monthlyRevenue: 0,
      planDistribution: [],
      topBusinesses: [],
      mrr: 0,
      saasCollected: 0,
      failedPaymentsCount: 0,
      paymentAttemptsCount: 0,
      currency: "XOF",
    });

    render(
      <MemoryRouter>
        <BackofficeRevenue />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Non disponible")).toBeInTheDocument();
    });
  });
});
