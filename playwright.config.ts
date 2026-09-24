import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a PRODUCTION build of the app (dev-mode compile times make
 * first loads flaky) with:
 *  - the Firebase Auth emulator (project demo-aroha — no real credentials),
 *    which lib/firebase.ts connects to when NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
 *    is set at build time, exposing window.__arohaE2E.signIn for e2e/fixtures/auth.ts;
 *  - the API pointed at a dead port (127.0.0.1:3999), answered entirely by
 *    e2e/fixtures/mock-api.ts — nothing can ever reach the real backend.
 *
 * Port 3100 (not 3000) so a running `npm run dev` is never reused by mistake:
 * it would be missing all of the env below.
 */
const PORT = 3100;
const E2E_ENV = {
  NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:3999",
  NEXT_PUBLIC_FIREBASE_AUTH_API_KEY: "demo-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-aroha.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_AUTH_PROJECT_ID: "demo-aroha",
  NEXT_PUBLIC_FIREBASE_AUTH_APP_ID: "1:000000000000:web:e2e",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  NEXT_PUBLIC_POSTHOG_KEY: "",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Region check (app/api/region) picks phone sign-in only for India; pin it.
    extraHTTPHeaders: { "x-vercel-ip-country": "IN" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "npx -y firebase-tools@13 emulators:start --only auth --project demo-aroha",
      url: "http://127.0.0.1:9099",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx next build && npx next start -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}/sign-in`,
      env: E2E_ENV,
      reuseExistingServer: false,
      timeout: 600_000,
    },
  ],
});
