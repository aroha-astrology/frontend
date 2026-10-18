import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * The silence rule of a voice call. Today a call hangs up after 10 seconds of silence. With
 * money.voiceSlices on it asks "still there?" at 10 seconds and hangs up at 15. The microphone is
 * replaced by an empty audio stream (Chromium's own fake device beeps, and a beep counts as a voice),
 * and Google's side answers the setup and then says nothing.
 */

test.use({ permissions: ["microphone"] });

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const BASE = { "paid.voiceChat": { ...ON, pricePaise: 2000 } };
const SESSION_ID = "11111111-1111-4111-8111-111111111111";

function voiceHandlers() {
  let minute = 1;
  const grant = (n: number) => ({
    voiceSessionId: SESSION_ID,
    token: `token-${n}`,
    model: "live-model",
    expiresAt: Date.now() + 60_000,
    minutesUsed: n,
    minutesRemaining: 30,
    pricePerMinutePaise: 2000,
    freeMinute: false,
    freeMinutesLeft: 0,
  });
  return {
    "POST /v1/voice/sessions": () => ({ json: grant(minute) }),
    "POST /v1/voice/sessions/:id/extend": () => ({ json: grant(++minute) }),
    "POST /v1/voice/sessions/:id/end": () => ({ json: { ok: true } }),
  };
}

/** A microphone that hears nothing at all. */
async function silentMicrophone(page: Page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext();
      return ctx.createMediaStreamDestination().stream;
    };
  });
}

/** Google answers the setup and then stays silent. */
async function silentGoogle(page: Page) {
  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as { setup?: unknown };
      if (message.setup) ws.send(JSON.stringify({ setupComplete: {} }));
    });
  });
}

async function startCall(page: Page, features: Record<string, unknown>) {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { features }, overrides: voiceHandlers() });
  await silentMicrophone(page);
  await silentGoogle(page);
  await signIn(page, "/ai-chat");
  await page.getByRole("button", { name: "Start voice chat" }).click();
  await expect(page.getByRole("dialog", { name: "Voice Chat" })).toBeVisible();
}

const nudge = (page: Page) => page.getByTestId("voice-still-there");
const dialog = (page: Page) => page.getByRole("dialog", { name: "Voice Chat" });

test.describe("the silence rule of a call", () => {
  test("with the gentler rule on: a nudge at 10 seconds, the call still open, then hung up at 15", async ({ page }) => {
    test.setTimeout(60_000);
    await startCall(page, { ...BASE, "money.voiceSlices": ON });

    // Quiet for 10 seconds: "still there?" shows, and the call is still going.
    await expect(nudge(page)).toBeVisible({ timeout: 20_000 });
    await expect(nudge(page)).toContainText("Still there?");
    await expect(dialog(page)).toBeVisible();

    // Five seconds later it hangs up (the screen stays to say why), and the reason says 15 seconds, not 10.
    const reason = dialog(page).getByRole("alert");
    await expect(reason).toHaveText("The call ended because nobody spoke for 15 seconds.", { timeout: 15_000 });
    await expect(nudge(page)).toHaveCount(0);
  });

  test("with the switch off: no nudge, and the call hangs up after 10 seconds as before", async ({ page }) => {
    test.setTimeout(60_000);
    await startCall(page, BASE);

    // It hangs up at 10 seconds with no warning first; the screen stays to say why.
    await expect(dialog(page).getByRole("alert")).toHaveText("The call ended because nobody spoke for 10 seconds.", {
      timeout: 20_000,
    });
    await expect(nudge(page)).toHaveCount(0);
  });
});
