import { defineConfig, devices } from "@playwright/test";

/**
 * Headless check of the Varshik PDF (frontend/e2e-pdf). It runs against `next dev` on the dev-only
 * /varshik-preview page, with no sign-in and no API, so it is quick to run:
 *   npx playwright test -c playwright.pdf.config.ts
 */
const PORT = Number(process.env.PDF_E2E_PORT ?? 3120);
export default defineConfig({
  testDir: "./e2e-pdf",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 300_000,
  expect: { timeout: 30_000 },
  use: { baseURL: `http://127.0.0.1:${PORT}`, acceptDownloads: true },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"], browserName: "chromium" } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/varshik-preview`,
    reuseExistingServer: true,
    timeout: 240_000,
    env: { NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:3999", NEXT_PUBLIC_POSTHOG_KEY: "" },
  },
});
