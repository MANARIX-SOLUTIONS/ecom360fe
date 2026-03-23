import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

const ThrowError = () => {
  throw new Error("Test error");
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders error UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réessayer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recharger la page/i })).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
    expect(screen.getByText("Custom error")).toBeInTheDocument();
  });

  it("retry button is clickable", async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    const retryBtn = screen.getByRole("button", { name: /Réessayer/i });
    await user.click(retryBtn);
    // After retry, boundary resets; child throws again so we stay in error state
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
  });
});
