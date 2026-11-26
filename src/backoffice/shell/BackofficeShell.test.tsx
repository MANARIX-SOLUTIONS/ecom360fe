import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getAdminStats, getAdminSystemHealth } from "@/api/backoffice";
import { BackofficePreferencesProvider } from "../preferences";
import { BackofficeShell } from "./BackofficeShell";

vi.mock("@/api/backoffice", () => ({
  getAdminSystemHealth: vi.fn(),
  getAdminStats: vi.fn(),
  searchAdmin: vi.fn(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    role: "super_admin",
    permissions: [],
    navigationRules: {},
    loading: false,
    can: () => true,
    canAccess: () => true,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    hasError: false,
    refetch: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/backoffice"]}>
      <Routes>
        <Route
          path="/backoffice"
          element={
            <BackofficePreferencesProvider>
              <BackofficeShell />
            </BackofficePreferencesProvider>
          }
        >
          <Route index element={<h1>Vue métier</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("BackofficeShell", () => {
  beforeEach(() => {
    vi.mocked(getAdminStats).mockResolvedValue({
      businessesCount: 3,
      usersCount: 4,
      storesCount: 2,
      monthlyRevenue: 1000,
      planDistribution: [],
      topBusinesses: [],
      pendingDemoRequestsCount: 2,
    });
  });

  it("shows the health overall, not a fixed operational label", async () => {
    vi.mocked(getAdminSystemHealth).mockResolvedValue({
      generatedAt: "2026-10-08T20:52:00.000Z",
      overall: "down",
      services: [{ key: "api", label: "API", status: "down", detail: "timeout" }],
    });
    renderShell();
    expect(await screen.findByRole("button", { name: /Incident/i })).toBeInTheDocument();
    expect(screen.queryByText("Plateforme Opérationnelle")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Demandes démo/i })).toHaveTextContent("2");
    expect(screen.getByRole("heading", { name: "Vue métier" })).toBeInTheDocument();
  });

  it("shows an unverified pill when the health check fails", async () => {
    vi.mocked(getAdminSystemHealth).mockRejectedValue(new Error("offline"));
    renderShell();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Non vérifiée/i })).toBeInTheDocument();
    });
  });
});
