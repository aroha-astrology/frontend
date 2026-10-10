import { test, expect } from "@playwright/test";
import { mockApi, callsTo, passStatus, PASS_REQUIRED } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Voice call is an Aroha Pass benefit. The server decides who may call; these
 * check what the app does with its answer. (A running call is not driven here:
 * its audio goes straight from the browser to Google, and the minute loop is
 * covered by lib/voice/gemini-live-client.test.ts and the backend's voice specs.)
 */

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const FEATURES = {
  "paid.voiceChat": { ...ON, pricePaise: 2000 },
  "nav.arohaPass": ON,
  "paid.arohaPassA": { ...ON, pricePaise: 19900 },
  "paid.arohaPassB": { ...ON, pricePaise: 29900 },
  "paid.arohaPassC": { ...ON, pricePaise: 39900 },
};

test("someone without a Pass who taps the call icon gets the Pass lock, not an error", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { features: FEATURES },
    overrides: {
      "POST /v1/voice/sessions": () => PASS_REQUIRED,
      "GET /v1/pass": () => ({ json: passStatus() }),
    },
  });
  await signIn(page, "/ai-chat");

  await page.getByRole("button", { name: "Start voice chat" }).click();

  const lock = page.getByTestId("pass-lock");
  await expect(lock).toBeVisible();
  // Every tier includes voice call, so the lock names the Pass, not a tier.
  await expect(lock.getByText("Voice Chat is part of Aroha Pass")).toBeVisible();
  await expect(lock.getByText("Voice call with Yogi Baba: 3 free minutes every month")).toBeVisible();
  await expect(lock.getByRole("link", { name: "Subscribe to unlock" })).toHaveAttribute("href", "/pass");

  // No call screen left behind, no failure message, and they were not asked to
  // agree to voice recording for a call they cannot make.
  await expect(page.getByRole("dialog", { name: "Voice Chat" })).toHaveCount(0);
  await expect(page.getByText("Could not start voice session")).toHaveCount(0);
  await expect(page.getByText("Start a voice conversation")).toHaveCount(0);
  expect(callsTo(api, "POST /v1/voice/sessions")).toHaveLength(1);
});

test("the consent sheet states the Pass price rule and the 10-second silence rule", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: FEATURES },
    overrides: {
      "POST /v1/voice/sessions": () => ({
        status: 403,
        json: { error: { code: "FORBIDDEN", message: "VOICE_CONSENT_REQUIRED" } },
      }),
    },
  });
  await signIn(page, "/ai-chat");

  await page.getByRole("button", { name: "Start voice chat" }).click();

  await expect(page.getByText("Start a voice conversation")).toBeVisible();
  // One paragraph carries both: what it costs, and when the call hangs up on its own.
  await expect(
    page.getByText(/3 free minutes each Pass month, then ₹20 a minute from your wallet.*The call ends if you do not speak for 10 seconds\./),
  ).toBeVisible();
  // Minimizing no longer ends it, and the sheet must not say it does.
  await expect(page.getByText(/minimi[sz]e/i)).toHaveCount(0);
  await expect(page.getByText("With Aroha Pass: 3 free minutes each month, then ₹20/min")).toBeVisible();
  // The old ceiling is gone from the wording.
  await expect(page.getByText(/3 min max|15-minute/)).toHaveCount(0);
});
