import { test, expect, type Page } from "@playwright/test";
import { mockApi, passStatus, PASS_REQUIRED, type MockState } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * The voice call trial (Durga Puja 2026): every user gets 3 minutes free once.
 * Someone without a Pass sees a 3-minute countdown, never a number built from
 * their wallet, and when the trial is spent the call ends with the Pass lock.
 * A member's call screen is unchanged. The call's audio goes to a fake Google
 * socket and the microphone is Chromium's fake device.
 */

test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
});

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const FEATURES = {
  "paid.voiceChat": { ...ON, pricePaise: 2000 },
  "chat.voiceTrial": ON,
  "nav.arohaPass": ON,
  "paid.arohaPassA": { ...ON, pricePaise: 19900 },
  "paid.arohaPassB": { ...ON, pricePaise: 29900 },
  "paid.arohaPassC": { ...ON, pricePaise: 39900 },
};

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const SILENCE = Buffer.alloc(4800).toString("base64");

function grant(opts: {
  minute: number;
  minutesRemaining: number;
  minuteMs: number;
  passMember: boolean;
  trialMinute: boolean;
}) {
  return {
    voiceSessionId: SESSION_ID,
    token: `token-${opts.minute}`,
    model: "live-model",
    expiresAt: Date.now() + opts.minuteMs,
    minutesUsed: opts.minute,
    minutesRemaining: opts.minutesRemaining,
    pricePerMinutePaise: 2000,
    freeMinute: opts.trialMinute,
    freeMinutesLeft: opts.trialMinute ? opts.minutesRemaining : 0,
    trialMinute: opts.trialMinute,
    passMember: opts.passMember,
  };
}

/**
 * A trial call by someone without a Pass: three trial minutes, then the server
 * refuses the fourth with PASS_REQUIRED, as voice.service.ts does.
 */
function trialHandlers(minuteMs: number) {
  let minute = 1;
  const trial = (m: number) =>
    grant({ minute: m, minutesRemaining: 3 - m, minuteMs, passMember: false, trialMinute: true });
  return {
    "POST /v1/voice/sessions": () => ({ json: trial(minute) }),
    "POST /v1/voice/sessions/:id/extend": () => (minute >= 3 ? PASS_REQUIRED : { json: trial(++minute) }),
    "POST /v1/voice/sessions/:id/end": () => ({ json: { ok: true } }),
    "GET /v1/pass": () => ({ json: passStatus() }),
  };
}

async function fakeGoogle(page: Page) {
  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const send = (message: unknown) => {
      try {
        ws.send(JSON.stringify(message));
      } catch {
        // the page already closed this socket
      }
    };
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as { setup?: unknown };
      if (!message.setup) return;
      send({ setupComplete: {} });
      timer = setInterval(() => {
        send({ serverContent: { inputTranscription: { text: "Baba ji, tell me about my career. " } } });
        send({
          serverContent: {
            outputTranscription: { text: "Beta, Saturn rewards steady work. " },
            modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: SILENCE } }] },
          },
        });
        send({ serverContent: { turnComplete: true } });
      }, 300);
    });
    ws.onClose(() => clearInterval(timer));
  });
}

const callScreen = (page: Page) => page.getByRole("dialog", { name: "Voice Chat" });
const extendCalls = (api: MockState) => api.calls.filter((c) => c.path.endsWith("/extend"));

test("a trial call counts down from 3:00, says the minute is free, and never asks to recharge", async ({ page }) => {
  await skipLaunchOverlays(page);
  // A full wallet: ₹100 would be 5 paid minutes for a member, and must not show here.
  await mockApi(page, { user: { features: FEATURES, walletBalancePaise: 10_000 }, overrides: trialHandlers(60_000) });
  await fakeGoogle(page);
  await signIn(page, "/ai-chat");

  await page.getByRole("button", { name: "Start voice chat" }).click();
  await expect(callScreen(page)).toBeVisible();

  await expect(callScreen(page).getByText(/^(3:00|2:5\d) remaining$/)).toBeVisible();
  // Loud enough that nobody wonders whether the wallet is being used.
  await expect(page.getByTestId("voice-trial-badge")).toHaveText("Free trial call");
  await expect(page.getByTestId("voice-rate")).toHaveText("Free minute 1 of 3");
  await expect(page.getByTestId("voice-low-balance")).toHaveCount(0);
  await expect(page.getByTestId("voice-trial-ending")).toHaveCount(0);

  await page.getByRole("button", { name: "End call", exact: true }).click();
  await expect(callScreen(page)).toHaveCount(0);
});

test("when the trial is spent the call ends with the Pass lock, saying the free minutes are used", async ({ page }) => {
  await skipLaunchOverlays(page);
  // A "minute" here lasts a second and a half (the client renews five seconds before the grant expires).
  const api = await mockApi(page, { user: { features: FEATURES }, overrides: trialHandlers(6_500) });
  await fakeGoogle(page);
  await signIn(page, "/ai-chat");

  await page.getByRole("button", { name: "Start voice chat" }).click();
  await expect(callScreen(page)).toBeVisible();

  // The counter follows the minutes, and the last one says the free call is ending.
  await expect(page.getByTestId("voice-rate")).toHaveText("Free minute 3 of 3", { timeout: 20_000 });
  await expect(page.getByTestId("voice-trial-ending")).toHaveText(
    "Your free call ends soon. Get Aroha Pass to keep talking.",
    { timeout: 20_000 },
  );

  const lock = page.getByTestId("pass-lock");
  await expect(lock).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("voice-trial-used")).toHaveText(
    "You've used your 3 free minutes. Get Aroha Pass to keep talking to Yogi Baba.",
  );
  await expect(lock.getByRole("link", { name: "Get Aroha Pass" })).toBeVisible();
  await expect(callScreen(page)).toHaveCount(0);
  // Three trial minutes asked for after the first, the last one refused.
  expect(extendCalls(api)).toHaveLength(3);
  await expect(page.getByText(/recharge/i)).toHaveCount(0);
});

test("a later tap once the trial is spent opens the lock with the same note", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: FEATURES },
    overrides: { "POST /v1/voice/sessions": () => PASS_REQUIRED, "GET /v1/pass": () => ({ json: passStatus() }) },
  });
  await signIn(page, "/ai-chat");

  await page.getByRole("button", { name: "Start voice chat" }).click();

  await expect(page.getByTestId("pass-lock")).toBeVisible();
  await expect(page.getByTestId("voice-trial-used")).toBeVisible();
});

test("with the trial switched off, the lock has no free-minutes note", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: { ...FEATURES, "chat.voiceTrial": { ...ON, enabled: false } } },
    overrides: { "POST /v1/voice/sessions": () => PASS_REQUIRED, "GET /v1/pass": () => ({ json: passStatus() }) },
  });
  await signIn(page, "/ai-chat?call=1");

  await expect(page.getByTestId("voice-trial-bubble")).toHaveCount(0);
  await page.getByRole("button", { name: "Start voice chat" }).click();

  await expect(page.getByTestId("pass-lock")).toBeVisible();
  await expect(page.getByTestId("voice-trial-used")).toHaveCount(0);
});

test("the consent sheet says the first 3 minutes are free", async ({ page }) => {
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

  await expect(page.getByTestId("voice-trial-consent")).toHaveText(
    "Your first 3 minutes are free, a gift for everyone.",
  );
});

test("the launch notification's link points out the call button", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { features: FEATURES },
    overrides: {
      "POST /v1/voice/sessions": () => ({
        status: 403,
        json: { error: { code: "FORBIDDEN", message: "VOICE_CONSENT_REQUIRED" } },
      }),
    },
  });
  await signIn(page, "/ai-chat?call=1");

  const bubble = page.getByTestId("voice-trial-bubble");
  await expect(bubble).toHaveText("3 free minutes · tap to call");
  // It does not start a call by itself: the browser needs a tap for the microphone.
  expect(api.calls.filter((c) => c.path === "/v1/voice/sessions")).toHaveLength(0);

  await bubble.click();
  await expect(page.getByText("Start a voice conversation")).toBeVisible();
  await expect(bubble).toHaveCount(0);
});

test("a member's call is unchanged: the wallet counts, and little time left asks to recharge", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: FEATURES },
    overrides: {
      "POST /v1/voice/sessions": () => ({
        json: grant({ minute: 4, minutesRemaining: 1, minuteMs: 60_000, passMember: true, trialMinute: false }),
      }),
      "POST /v1/voice/sessions/:id/end": () => ({ json: { ok: true } }),
    },
  });
  await fakeGoogle(page);
  await signIn(page, "/ai-chat");

  await page.getByRole("button", { name: "Start voice chat" }).click();

  await expect(page.getByTestId("voice-rate")).toHaveText("₹20/min from your wallet");
  await expect(page.getByTestId("voice-trial-badge")).toHaveCount(0);
  await expect(page.getByTestId("voice-low-balance")).toBeVisible();
  await expect(page.getByTestId("voice-trial-ending")).toHaveCount(0);
  await page.getByRole("button", { name: "End call", exact: true }).click();
});
