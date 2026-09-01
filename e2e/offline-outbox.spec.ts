import { test, expect } from "@playwright/test";
import {
  mockPosApis,
  seedPosSession,
  unmockPosApis,
  waitForActiveServiceWorker,
} from "./helpers/mockPosApi";

test.describe("POS offline outbox", () => {
  test("@offline three cash sales sync once; fourth is blocked by local stock", async ({
    page,
    context,
  }) => {
    test.skip(process.env.E2E_PWA !== "1", "Requires a production preview (E2E_PWA=1)");
    await seedPosSession(page);
    await mockPosApis(page, { stockQty: 3 });
    await page.goto("/pos");
    const product = page.getByRole("button", { name: /Savon/i });
    await expect(product).toBeVisible({ timeout: 20_000 });
    await waitForActiveServiceWorker(page);

    await context.setOffline(true);

    const queuedToast = page.getByText("Vente enregistrée — sync à la reconnexion");
    const validate = page.getByRole("button", { name: "Valider la vente" });

    async function sellOne() {
      await product.click();
      await validate.click();
      await expect(queuedToast.last()).toBeVisible();
      await expect(validate).toBeDisabled();
    }

    await sellOne();
    await sellOne();
    await sellOne();

    await expect(page.getByText(/Rupture de stock/i)).toBeVisible();

    const posted: string[] = [];
    await unmockPosApis(page);
    await mockPosApis(page, { stockQty: 3 });
    await context.route("**/api/v1/sales", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      const body = route.request().postDataJSON() as { clientSaleId?: string };
      posted.push(body.clientSaleId ?? "");
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: `sale-${posted.length}`,
          businessId: "biz-e2e",
          storeId: "11111111-1111-1111-1111-111111111111",
          userId: "u",
          clientId: null,
          receiptNumber: `RCP-${posted.length}`,
          paymentMethod: "cash",
          subtotal: 500,
          discountAmount: 0,
          total: 500,
          amountReceived: 500,
          changeGiven: 0,
          amountPaid: 500,
          remainingAmount: 0,
          paymentStatus: "paid",
          dueDate: null,
          status: "completed",
          lines: [],
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await context.setOffline(false);
    await expect.poll(() => posted.length, { timeout: 15_000 }).toBe(3);
    expect(new Set(posted).size).toBe(3);
  });
});
