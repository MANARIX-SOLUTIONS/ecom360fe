import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineBanner } from "./OfflineBanner";

vi.mock("@/hooks/useNetworkStatus", () => ({
  useNetworkStatus: vi.fn(() => ({ online: true, offline: false })),
}));

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.mocked(useNetworkStatus).mockReturnValue({ online: true, offline: false });
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
});
