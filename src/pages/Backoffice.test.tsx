import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Backoffice from "./Backoffice";

vi.mock("@/api/backoffice", () => ({
  getAdminStats: vi.fn(),
  getAdminRevenue: vi.fn(),
  getAdminSystemHealth: vi.fn(),
  listAdminAuditLogs: vi.fn(),
}));

import {
  getAdminRevenue,
  getAdminStats,
  getAdminSystemHealth,
  listAdminAuditLogs,
} from "@/api/backoffice";

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Backoffice />
    </MemoryRouter>
  );
}

describe("Backoffice dashboard", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: String(query).includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(getAdminRevenue).mockResolvedValue({
      currency: "XOF",
      periodFrom: new Date().toISOString(),
      periodTo: new Date().toISOString(),
      points: [],
    });
    vi.mocked(getAdminSystemHealth).mockResolvedValue({
      generatedAt: new Date().toISOString(),
      overall: "healthy",
      services: [{ key: "api", label: "API", status: "healthy", detail: "ok" }],
    });
    vi.mocked(listAdminAuditLogs).mockResolvedValue({
      content: [],
      page: 0,
      size: 8,
      totalElements: 0,
      totalPages: 0,
    });
  });

  it("renders KPI values from the API", async () => {
    vi.mocked(getAdminStats).mockResolvedValue({
      businessesCount: 12,
      usersCount: 40,
      storesCount: 18,
      monthlyRevenue: 1000,
      planDistribution: [{ plan: "Pro", count: 4, pct: 33 }],
      topBusinesses: [],
      mrr: 25000,
      saasCollected: 15000,
      failedPaymentsCount: 2,
      currency: "XOF",
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vue d'ensemble" })).toBeInTheDocument();
      expect(screen.getByText("MRR")).toBeInTheDocument();
      expect(screen.getByText("GMV traité")).toBeInTheDocument();
      expect(screen.getByText("Volume traité par les clients")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getAllByText("Non disponible").length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText("Commerce")).not.toBeInTheDocument();
    });
  });

  it("shows an unavailable state when stats cannot load", async () => {
    vi.mocked(getAdminStats).mockRejectedValue(new Error("boom"));
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Statistiques indisponibles")).toBeInTheDocument();
    });
  });
});
