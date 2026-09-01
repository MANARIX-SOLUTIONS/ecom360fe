import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests for 360 PME Commerce.
 * Default: npm run dev on :5173 (and backend on :8080 for auth tests).
 * PWA/offline (`E2E_PWA=1`): production preview on :4173 so it does not collide with vite.
 * Run smoke-only tests without backend: npx playwright test --grep @smoke
 */
const isPwaE2e = process.env.E2E_PWA === "1";
const e2ePort = isPwaE2e ? 4173 : 5173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: isPwaE2e
      ? `npm run build && npx vite preview --port ${e2ePort} --strictPort`
      : "npm run dev",
    url: `http://localhost:${e2ePort}`,
    reuseExistingServer: !process.env.CI && !isPwaE2e,
    timeout: 180_000,
  },
});
