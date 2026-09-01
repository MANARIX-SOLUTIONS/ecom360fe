import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineBanner } from "./OfflineBanner";

vi.mock("@/hooks/useNetworkStatus", () => ({
  useNetworkStatus: vi.fn(() => ({ online: true, offline: false })),
}));

vi.mock("@/hooks/useSaleOutbox", () => ({
  useSaleOutbox: vi.fn(() => ({
    items: [],
    pendingCount: 0,
    failed: [],
    syncing: false,
  })),
}));

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSaleOutbox } from "@/hooks/useSaleOutbox";

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.mocked(useNetworkStatus).mockReturnValue({ online: true, offline: false });
    vi.mocked(useSaleOutbox).mockReturnValue({
      items: [],
      pendingCount: 0,
      failed: [],
      syncing: false,
    });
  });

  it("renders nothing when online", () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders banner when offline", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({ online: false, offline: true });
    render(<OfflineBanner />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Vous êtes hors ligne/i)).toBeInTheDocument();
  });

  it("mentions pending sales when the outbox is not empty", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({ online: false, offline: true });
    vi.mocked(useSaleOutbox).mockReturnValue({
      items: [],
      pendingCount: 2,
      failed: [],
      syncing: false,
    });
    render(<OfflineBanner />);
    expect(screen.getByText(/2 ventes seront envoyées/i)).toBeInTheDocument();
  });
});
