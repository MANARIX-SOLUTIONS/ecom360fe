import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "antd";
import BackofficeDemoRequests from "./BackofficeDemoRequests";

vi.mock("@/api/backoffice", () => ({
  listAdminDemoRequests: vi.fn(),
  approveAdminDemoRequest: vi.fn(),
  rejectAdminDemoRequest: vi.fn(),
}));

import { listAdminDemoRequests } from "@/api/backoffice";

describe("BackofficeDemoRequests", () => {
  beforeEach(() => {
    vi.mocked(listAdminDemoRequests).mockResolvedValue({
      content: [
        {
          id: "req-1",
          fullName: "Awa Diop",
          email: "awa@example.com",
          phone: "770000000",
          businessName: "Boutique Awa",
          message: null,
          jobTitle: null,
          city: "Dakar",
          sector: "Commerce",
          status: "pending",
          createdAt: new Date().toISOString(),
          reviewedAt: null,
          reviewedByUserId: null,
          rejectionReason: null,
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
  });

  it("renders demo request rows from the API", async () => {
    render(
      <MemoryRouter>
        <App>
          <BackofficeDemoRequests />
        </App>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Demandes de démo")).toBeInTheDocument();
      expect(screen.getByText("Boutique Awa")).toBeInTheDocument();
      expect(screen.getByText("Commerce")).toBeInTheDocument();
    });
  });
});
