import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SkipLink } from "./SkipLink";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("SkipLink", () => {
  it("renders skip link with correct text", () => {
    renderWithRouter(<SkipLink />);
    const link = screen.getByRole("link", { name: /Aller au contenu principal/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });
});
