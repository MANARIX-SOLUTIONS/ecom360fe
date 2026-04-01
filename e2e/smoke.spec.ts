import { test, expect } from "@playwright/test";

test.describe("Smoke tests (no backend required)", () => {
  test("@smoke login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /360 PME/i })).toBeVisible();
    await expect(page.getByPlaceholder("exemple@domaine.com")).toBeVisible();
    await expect(page.getByPlaceholder("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("@smoke demo request page renders", async ({ page }) => {
    await page.goto("/demo-request");
    await expect(page.getByRole("heading", { name: "Demander une démo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  });

  test("@smoke 404 page renders", async ({ page }) => {
    await page.goto("/unknown-route-xyz");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page non trouvée")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retour au tableau de bord" })).toBeVisible();
  });

  test("@smoke login link navigates to demo request", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Demander une démo" }).click();
    await expect(page).toHaveURL(/\/demo-request/);
  });

  test("@smoke demo request link navigates to login", async ({ page }) => {
    await page.goto("/demo-request");
    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
