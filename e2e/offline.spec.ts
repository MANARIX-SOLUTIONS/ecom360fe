import { test, expect } from "@playwright/test";
import { mockPosApis, seedPosSession, waitForActiveServiceWorker } from "./helpers/mockPosApi";

test.describe("PWA POS offline shell", () => {
  test("@offline reload without network still shows the POS catalogue", async ({
    page,
    context,
  }) => {
    test.skip(process.env.E2E_PWA !== "1", "Requires a production preview (E2E_PWA=1)");
    await seedPosSession(page);
    await mockPosApis(page);
    await page.goto("/pos");
    await expect(page.getByRole("button", { name: /Savon/i })).toBeVisible({ timeout: 20_000 });
    await waitForActiveServiceWorker(page);
    // Second visit while online: SW takes control and fills the runtime cache.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Savon/i })).toBeVisible({ timeout: 20_000 });
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Savon/i })).toBeVisible({ timeout: 20_000 });
  });
});
