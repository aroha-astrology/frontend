import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { LATEST_PLAY_BUILD, PALM_MIN_BUILD } from "../lib/app-update";
import { PLAY_STORE_URL } from "../lib/app-review";

// Owner, 2026-10-24: whenever someone opens Palmistry, the installed Android build is checked
// first; an older one is asked to update from Play before it can do anything. The gate only
// switches on once the new build is on Play (LATEST_PLAY_BUILD raised to PALM_MIN_BUILD), so these
// tests expect whichever state the constants are in.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const READING = "22222222-2222-4222-8222-222222222222";
const PUBLISHED = LATEST_PLAY_BUILD >= PALM_MIN_BUILD;

/** Makes the page believe it runs in the Android app, on the given installed build. */
async function asAndroid(page: Page, build: number) {
  await page.addInitScript((b) => {
    const w = window as unknown as Record<string, unknown>;
    w.__opened = [] as string[];
    w.open = (url: string) => {
      (w.__opened as string[]).push(url);
      return null;
    };
    w.androidBridge = { postMessage: () => {} };
    w.Capacitor = {
      PluginHeaders: [{ name: "App", methods: [{ name: "getInfo", rtype: "promise" }] }],
      nativePromise: (plugin: string, method: string) =>
        plugin === "App" && method === "getInfo"
          ? Promise.resolve({ build: String(b), version: "1.x", id: "com.aroha.astrology", name: "Aroha" })
          : Promise.resolve({}),
      nativeCallback: () => "e2e",
    };
  }, build);
}

async function open(page: Page, path: string) {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { gender: "male", features: { "home.palmReading": ON } },
    overrides: {
      "GET /v1/palm/readings": () => ({ json: { readings: [] } }),
      "GET /v1/palm/readings/:id": () => ({
        json: { id: READING, status: "observed", primaryHand: "right", frames: {}, unlocked: false, confidenceScore: 80, observations: { primary: { majorLines: {} } }, events: [] },
      }),
    },
  });
  await signIn(page, path);
}

for (const [label, path] of [
  ["the Palmistry page", "/palm"],
  ["a palm reading", `/palm/${READING}`],
] as const) {
  test.describe(`Palmistry build check: ${label}`, () => {
    test("an older Android build is asked to update (once the new build is on Play)", async ({ page }) => {
      await asAndroid(page, PALM_MIN_BUILD - 1);
      await open(page, path);
      if (PUBLISHED) {
        const gate = page.getByTestId("palm-update-gate");
        await expect(gate).toBeVisible();
        await expect(gate).toContainText("Update Aroha to use Palmistry");
        // Nothing of Palmistry is reachable behind it.
        await expect(page.getByRole("button", { name: /Start a New Reading/ })).toHaveCount(0);
        await page.getByTestId("palm-update-cta").click();
        expect(await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)).toEqual([PLAY_STORE_URL]);
      } else {
        // The new build is not on Play yet: nobody is sent to an update that does not exist.
        await expect(page.getByTestId("palm-update-gate")).toHaveCount(0);
        await expect(page.locator("main").first()).toBeVisible();
      }
    });

    test("the new build goes straight in", async ({ page }) => {
      await asAndroid(page, PALM_MIN_BUILD);
      await open(page, path);
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.getByTestId("palm-update-gate")).toHaveCount(0);
    });

    test("the web is never blocked", async ({ page }) => {
      await open(page, path);
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.getByTestId("palm-update-gate")).toHaveCount(0);
    });
  });
}
