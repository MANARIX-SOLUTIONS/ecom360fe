import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import { MemoryRouter } from "react-router-dom";
import BackofficeSystem from "./BackofficeSystem";

vi.mock("@/api/backoffice", () => ({
  getAdminSystemHealth: vi.fn().mockResolvedValue({
    generatedAt: new Date().toISOString(),
    overall: "healthy",
    services: [{ key: "api", label: "API", status: "healthy", detail: "Le service répond." }],
  }),
  listAdminFeatureFlags: vi.fn().mockResolvedValue([
    {
      id: "1",
      key: "public_api",
      label: "API publique",
      description: "Webhooks",
      enabled: true,
      updatedAt: new Date().toISOString(),
    },
  ]),
  getLandingStatus: vi.fn().mockResolvedValue({ loading: false }),
  updateLandingStatus: vi.fn(),
  updateAdminFeatureFlag: vi.fn(),
  listAdminAuditLogs: vi.fn().mockResolvedValue({
    content: [],
    page: 0,
    size: 8,
    totalElements: 0,
    totalPages: 0,
  }),
}));

describe("BackofficeSystem", () => {
  it("renders verified health and persisted flags", async () => {
    render(
      <MemoryRouter>
        <App>
          <BackofficeSystem />
        </App>
      </MemoryRouter>
    );
    expect(screen.getByText("Santé et configuration")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("API publique")).toBeInTheDocument();
    });
  });
});
