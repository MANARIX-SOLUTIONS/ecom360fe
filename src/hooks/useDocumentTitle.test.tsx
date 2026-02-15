import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useDocumentTitle } from "./useDocumentTitle";

function TitleConsumer() {
  useDocumentTitle();
  return null;
}

describe("useDocumentTitle", () => {
  it("sets document title for /dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<TitleConsumer />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.title).toBe("Tableau de bord — 360 PME Commerce");
  });

  it("sets document title for /login", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<TitleConsumer />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.title).toBe("Connexion — 360 PME Commerce");
  });

  it("sets document title for /products (segment match)", () => {
    render(
      <MemoryRouter initialEntries={["/products/123"]}>
        <Routes>
          <Route path="/products/:id" element={<TitleConsumer />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.title).toBe("Produits — 360 PME Commerce");
  });

  it("uses custom title when provided", () => {
    function CustomTitle() {
      useDocumentTitle("Titre personnalisé");
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<CustomTitle />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.title).toBe("Titre personnalisé — 360 PME Commerce");
  });
});
