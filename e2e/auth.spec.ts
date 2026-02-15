import { test, expect } from "@playwright/test";

/**
 * Auth E2E tests — require backend running (docker compose up, or local Spring Boot).
 * Run with: npx playwright test e2e/auth.spec.ts
 * Skip in CI if backend not available: npx playwright test --grep-invert @auth
 */
test.describe("Auth flow (backend required)", () => {
  test.skip(
    () => !!process.env.CI,
    "Auth tests require backend; run locally with docker compose up"
  );

  test("@auth login with valid credentials redirects to dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("exemple@domaine.com").fill("owner@test.com");
    await page.getByPlaceholder("Mot de passe").fill("password123");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });
});
