import type { Page } from "@playwright/test";

export const STORE_ID = "11111111-1111-1111-1111-111111111111";
export const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
export const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";

export async function seedPosSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("ecom360_auth", "true");
    localStorage.setItem("ecom360_access_token", "e2e-token");
    localStorage.setItem("ecom360_refresh_token", "e2e-refresh");
    localStorage.setItem("ecom360_business_id", "biz-e2e");
    localStorage.setItem("ecom360_role", "caissier");
    localStorage.setItem("ecom360_active_store_id", "11111111-1111-1111-1111-111111111111");
    localStorage.setItem(
      "ecom360_permissions_bundle",
      JSON.stringify({
        permissions: ["SALES_CREATE", "SALES_READ", "PRODUCTS_READ", "STOCK_READ", "CLIENTS_READ"],
        navigationRules: { pos: ["SALES_CREATE"] },
        role: "caissier",
        fetchedAt: Date.now(),
      })
    );
  });
}

function json(data: unknown) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

/** Intercept at the context so the service worker's fetches are mocked and cacheable. */
export async function mockPosApis(page: Page, opts?: { stockQty?: number }) {
  const qty = opts?.stockQty ?? 3;
  await page.context().route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (method === "POST" && path.endsWith("/sales")) {
      await route.abort("failed");
      return;
    }

    if (path.endsWith("/permissions/me")) {
      await route.fulfill(
        json({
          role: "caissier",
          permissions: [
            "SALES_CREATE",
            "SALES_READ",
            "PRODUCTS_READ",
            "STOCK_READ",
            "CLIENTS_READ",
          ],
          navigationRules: { pos: ["SALES_CREATE"] },
        })
      );
      return;
    }
    if (path.endsWith("/stores") && method === "GET") {
      await route.fulfill(
        json([
          {
            id: STORE_ID,
            businessId: "biz-e2e",
            name: "Boutique E2E",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ])
      );
      return;
    }
    if (path.includes("/stock/store/") && method === "GET") {
      await route.fulfill(
        json({
          content: [
            {
              id: "stock-1",
              productId: PRODUCT_ID,
              productName: "Savon",
              storeId: STORE_ID,
              storeName: "Boutique E2E",
              quantity: qty,
              minStock: 0,
              lowStock: false,
              updatedAt: new Date().toISOString(),
              salePrice: 500,
              categoryId: null,
              imageUrl: null,
            },
          ],
          page: 0,
          size: 100,
          totalElements: 1,
          totalPages: 1,
        })
      );
      return;
    }
    if (path.endsWith("/categories") && method === "GET") {
      await route.fulfill(json([]));
      return;
    }
    if (path.includes("/clients") && method === "GET") {
      await route.fulfill(
        json({
          content: [
            {
              id: CLIENT_ID,
              businessId: "biz-e2e",
              name: "Client comptoir",
              phone: null,
              email: null,
              address: null,
              notes: null,
              creditBalance: 0,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          page: 0,
          size: 100,
          totalElements: 1,
          totalPages: 1,
        })
      );
      return;
    }
    if (path.endsWith("/subscription/me") || path.endsWith("/subscription/plans")) {
      await route.fulfill(json(path.endsWith("/plans") ? [] : null));
      return;
    }
    if (path.endsWith("/subscription/usage")) {
      await route.fulfill(
        json({
          usersCount: 1,
          usersLimit: 0,
          storesCount: 1,
          storesLimit: 0,
          productsCount: 1,
          productsLimit: 0,
          clientsCount: 1,
          clientsLimit: 0,
          suppliersCount: 0,
          suppliersLimit: 0,
          salesThisMonth: 0,
          salesLimit: 0,
        })
      );
      return;
    }
    if (path.endsWith("/business/me")) {
      await route.fulfill(
        json({
          id: "biz-e2e",
          name: "E2E",
          email: "e2e@test.com",
        })
      );
      return;
    }
    if (path.includes("/notifications")) {
      await route.fulfill(
        json({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 })
      );
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
  });
}

export async function unmockPosApis(page: Page) {
  await page.context().unroute("**/api/v1/**");
}

/**
 * Wait until the generated SW is active and controlling this page.
 * First load installs the worker; a later navigation is needed before
 * offline reload can be served from Cache Storage.
 */
export async function waitForActiveServiceWorker(page: Page) {
  await page.waitForFunction(
    () => "serviceWorker" in navigator && navigator.serviceWorker.controller != null,
    null,
    { timeout: 20_000 }
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
}
