import { test, expect, type Page } from "@playwright/test";
import { mockApi, type MockState } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Sprint 13: a missing microphone is asked for BEFORE the call starts, so no
 * minute is taken, and the screen explains it instead of ending in a dead end.
 * The microphone is a stub that refuses until the test lets it through.
 */

test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const FEATURES = { "paid.voiceChat": { ...ON, pricePaise: 2000 } };

const grant = () => ({
  voiceSessionId: "11111111-1111-4111-8111-111111111111",
  token: "token-1",
  model: "live-model",
  expiresAt: Date.now() + 60_000,
  minutesUsed: 1,
  minutesRemaining: 30,
  pricePerMinutePaise: 2000,
  freeMinute: true,
  freeMinutesLeft: 2,
});

const voiceHandlers = () => ({
  "POST /v1/voice/sessions": () => ({ json: grant() }),
  "POST /v1/voice/sessions/:id/end": () => ({ json: { ok: true } }),
});

const startCalls = (api: MockState) => api.calls.filter((c) => c.method === "POST" && c.path.endsWith("/v1/voice/sessions"));

/** Microphone refuses until `window.__mic` is set to "allow"; `__micState` is what permissions.query reports. */
async function stubMicrophone(page: Page, state: "prompt" | "denied", dialogMs = 700) {
  await page.addInitScript(([initial, delay]) => {
    const w = window as unknown as { __mic: string; __micState: string };
    w.__mic = "deny";
    w.__micState = initial as string;
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => {
      // A real refusal comes after someone read the system dialog; an instant one means no dialog was shown.
      await new Promise((r) => setTimeout(r, delay as number));
      if (w.__mic !== "allow") throw new DOMException("denied", "NotAllowedError");
      return real(c);
    };
    const realQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = async (d) =>
      (d as { name: string }).name === "microphone" ? ({ state: w.__micState } as PermissionStatus) : realQuery(d);
  }, [state, dialogMs] as const);
}

async function setup(page: Page, state: "prompt" | "denied", dialogMs = 700) {
  await skipLaunchOverlays(page);
  await stubMicrophone(page, state, dialogMs);
  const api = await mockApi(page, { user: { features: FEATURES }, overrides: voiceHandlers() });
  await signIn(page, "/ai-chat");
  return api;
}

test("microphone refused: the sheet explains it, nothing is taken, and Try again starts the call", async ({ page }) => {
  const api = await setup(page, "prompt");
  await page.getByRole("button", { name: "Start voice chat" }).click();

  const sheet = page.getByTestId("permission-sheet");
  await expect(sheet).toContainText("Baba needs your microphone");
  await sheet.getByRole("button", { name: "Allow" }).click();
  await expect(sheet).toContainText("It is still off");
  expect(startCalls(api)).toHaveLength(0);
  // The old dead end must not appear.
  await expect(page.getByText("Aroha could not use your microphone")).toHaveCount(0);

  await page.evaluate(() => ((window as unknown as { __mic: string }).__mic = "allow"));
  await sheet.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("dialog", { name: "Voice Chat" })).toBeVisible();
  await expect.poll(() => startCalls(api).length).toBe(1);
});

test("microphone blocked for good: shows the settings path, and coming back after allowing it continues the call", async ({ page }) => {
  const api = await setup(page, "denied");
  await page.getByRole("button", { name: "Start voice chat" }).click();

  const sheet = page.getByTestId("permission-sheet");
  await sheet.getByRole("button", { name: "Allow" }).click();
  await expect(sheet).toContainText("Settings → Apps → Aroha → Permissions → Microphone");
  expect(startCalls(api)).toHaveLength(0);

  // The reader allows it in the phone's settings and returns to the app.
  await page.evaluate(() => {
    const w = window as unknown as { __mic: string; __micState: string };
    w.__mic = "allow";
    w.__micState = "granted";
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog", { name: "Voice Chat" })).toBeVisible();
  await expect.poll(() => startCalls(api).length).toBe(1);
});

test("phone shows no dialog (instant refusal, cannot tell it is blocked): goes straight to the settings screen", async ({ page }) => {
  const api = await setup(page, "prompt", 0);
  await page.getByRole("button", { name: "Start voice chat" }).click();
  const sheet = page.getByTestId("permission-sheet");
  await sheet.getByRole("button", { name: "Allow" }).click();
  await expect(sheet).toContainText("Settings → Apps → Aroha → Permissions → Microphone");
  await expect(sheet.getByRole("button", { name: "Try again" })).toHaveCount(0);
  expect(startCalls(api)).toHaveLength(0);
});

test("refused again on Try again: the second refusal moves to the settings screen", async ({ page }) => {
  const api = await setup(page, "prompt");
  await page.getByRole("button", { name: "Start voice chat" }).click();
  const sheet = page.getByTestId("permission-sheet");
  await sheet.getByRole("button", { name: "Allow" }).click();
  await expect(sheet).toContainText("It is still off");
  await sheet.getByRole("button", { name: "Try again" }).click();
  await expect(sheet).toContainText("Settings → Apps → Aroha → Permissions → Microphone");
  await expect(sheet.getByRole("button", { name: "Try again" })).toHaveCount(0);
  expect(startCalls(api)).toHaveLength(0);
});

test("closing the sheet leaves the chat as it was and takes nothing", async ({ page }) => {
  const api = await setup(page, "prompt");
  await page.getByRole("button", { name: "Start voice chat" }).click();
  await page.getByTestId("permission-sheet").getByRole("button", { name: "Not now" }).click();
  await expect(page.getByTestId("permission-sheet")).toHaveCount(0);
  expect(startCalls(api)).toHaveLength(0);
});

test.describe("at 360px", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("every screen of the sheet fits: no sideways scroll, buttons fully on screen", async ({ page }, info) => {
    await setup(page, "denied");
    await page.getByRole("button", { name: "Start voice chat" }).click();
    const sheet = page.getByTestId("permission-sheet");

    const fits = async (label: string) => {
      const noSideScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      expect(noSideScroll, `${label}: page scrolls sideways`).toBe(true);
      for (const button of await sheet.getByRole("button").all()) {
        const box = (await button.boundingBox())!;
        expect(box.x, `${label}: button left edge`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${label}: button right edge`).toBeLessThanOrEqual(360);
        expect(box.y + box.height, `${label}: button bottom edge`).toBeLessThanOrEqual(640);
        expect(box.height, `${label}: tap target`).toBeGreaterThanOrEqual(40);
      }
      await page.screenshot({ path: info.outputPath(`${label}.png`) });
    };

    await fits("why");
    await sheet.getByRole("button", { name: "Allow" }).click();
    await expect(sheet).toContainText("Settings → Apps → Aroha");
    await fits("blocked");
  });
});
