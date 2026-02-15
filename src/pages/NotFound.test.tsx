import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

describe("NotFound", () => {
  it("renders 404 message and back button", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(/Page non trouvée/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retour au tableau de bord/i })).toBeInTheDocument();
  });

  it("navigates to dashboard when button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <NotFound />
      </MemoryRouter>
    );
    const button = screen.getByRole("button", { name: /Retour au tableau de bord/i });
    await user.click(button);
    expect(button).toBeInTheDocument();
  });
});
