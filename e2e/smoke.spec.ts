import { test, expect } from "@playwright/test";

test.describe("Smoke tests (no backend required)", () => {
  test("@smoke login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /360 PME/i })).toBeVisible();
    await expect(page.getByPlaceholder("exemple@domaine.com")).toBeVisible();
    await expect(page.getByPlaceholder("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("@smoke register page renders", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  });

  test("@smoke 404 page renders", async ({ page }) => {
    await page.goto("/unknown-route-xyz");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page non trouvée")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retour au tableau de bord" })).toBeVisible();
  });

  test("@smoke login link navigates to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Essai gratuit 30 jours" }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("@smoke register link navigates to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
