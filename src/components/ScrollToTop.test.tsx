import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { ScrollToTop } from "./ScrollToTop";

describe("ScrollToTop", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("calls scrollTo on mount", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ScrollToTop />
      </MemoryRouter>
    );
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("calls scrollTo when pathname changes", async () => {
    const user = userEvent.setup();
    vi.mocked(window.scrollTo).mockClear();

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ScrollToTop />
        <Routes>
          <Route path="/dashboard" element={<Link to="/products">Go to products</Link>} />
          <Route path="/products" element={<span>Products</span>} />
        </Routes>
      </MemoryRouter>
    );

    vi.mocked(window.scrollTo).mockClear();
    await user.click(screen.getByRole("link", { name: /Go to products/i }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
