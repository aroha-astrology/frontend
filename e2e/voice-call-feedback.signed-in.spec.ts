import { test, expect, type Page } from "@playwright/test";
import { mockApi, type ApiCall, type MockState } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * "How was your call with Yogi Baba?" after a voice call (switch
 * `chat.voiceFeedback`). The call's audio goes to a fake Google socket and the
 * microphone is Chromium's fake device, as in voice-call-end. The question
 * needs 30 s of connected call, so the long cases really talk for that long.
 */

test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
});

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const VOICE = { "paid.voiceChat": { ...ON, pricePaise: 2000 } };
const WITH_FEEDBACK = { ...VOICE, "chat.voiceFeedback": ON };

const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const MINUTE_MS = 60_000;
const SILENCE = Buffer.alloc(4800).toString("base64");

function grant(minute: number) {
  return {
    voiceSessionId: SESSION_ID,
    token: `token-${minute}`,
    model: "live-model",
    expiresAt: Date.now() + MINUTE_MS,
    minutesUsed: minute,
    minutesRemaining: 30,
    pricePerMinutePaise: 2000,
    freeMinute: false,
    freeMinutesLeft: 0,
  };
}

function voiceHandlers() {
  let minute = 1;
  return {
    "POST /v1/voice/sessions": () => ({ json: grant(minute) }),
    "POST /v1/voice/sessions/:id/extend": () => ({ json: grant(++minute) }),
    "POST /v1/voice/sessions/:id/end": () => ({ json: { ok: true } }),
    "POST /v1/voice/sessions/:id/feedback": () => ({ json: { ok: true } }),
  };
}

const feedbackCalls = (api: MockState): ApiCall[] => api.calls.filter((c) => c.path.endsWith("/feedback"));

/** Google answering the call: setup, then a conversation that keeps going (so the silence rule never ends it). */
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
      }, 400);
    });
    ws.onClose(() => clearInterval(timer));
  });
}

/** Calls, talks for `seconds` once the call is up, and hangs up. */
async function callFor(page: Page, seconds: number) {
  await page.getByRole("button", { name: "Start voice chat" }).click();
  const callScreen = page.getByRole("dialog", { name: "Voice Chat" });
  await expect(callScreen).toBeVisible();
  await expect(page.getByRole("button", { name: "End call" })).toBeVisible();
  await page.waitForTimeout(seconds * 1000);
  await page.getByRole("button", { name: "End call" }).click();
  await expect(callScreen).toHaveCount(0);
}

test.describe.configure({ timeout: 120_000 });

test("after a call of 30 s or more the caller is asked how it went, and the answer is sent", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { features: WITH_FEEDBACK }, overrides: voiceHandlers() });
  await fakeGoogle(page);
  await signIn(page, "/ai-chat");

  await callFor(page, 32);

  const sheet = page.getByTestId("call-feedback-sheet");
  await expect(sheet).toBeVisible();
  await expect(page.getByRole("heading", { name: "How was your call with Yogi Baba?" })).toBeVisible();

  // A poor rating offers what went wrong; a good one offers what was liked.
  await page.getByRole("button", { name: "Rate 5 out of 5" }).click();
  await expect(sheet.getByText("What did you like?")).toBeVisible();
  await expect(page.getByTestId("call-feedback-tag-clearVoice")).toBeVisible();
  await page.getByTestId("call-feedback-tag-clearVoice").click();

  await page.getByRole("button", { name: "Rate 2 out of 5" }).click();
  await expect(sheet.getByText("What went wrong?")).toBeVisible();
  await expect(page.getByTestId("call-feedback-tag-clearVoice")).toHaveCount(0);
  await page.getByTestId("call-feedback-tag-callCut").click();
  await sheet.getByRole("textbox").fill("It stopped in the middle");
  await sheet.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByTestId("call-feedback-thanks")).toBeVisible();
  await expect.poll(() => feedbackCalls(api).length).toBe(1);
  const sent = feedbackCalls(api)[0]!;
  expect(sent.path).toContain(SESSION_ID);
  expect(sent.body).toEqual({ rating: 2, tags: ["callCut"], comment: "It stopped in the middle" });
  // The thank-you closes itself.
  await expect(page.getByTestId("call-feedback-thanks")).toHaveCount(0, { timeout: 5_000 });
});

test("a short call is not asked about", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { features: WITH_FEEDBACK }, overrides: voiceHandlers() });
  await fakeGoogle(page);
  await signIn(page, "/ai-chat");

  await callFor(page, 3);

  await page.waitForTimeout(1_000);
  await expect(page.getByTestId("call-feedback-sheet")).toHaveCount(0);
  expect(feedbackCalls(api)).toHaveLength(0);
});

test("with the switch off, even a long call is not asked about", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { features: VOICE }, overrides: voiceHandlers() });
  await fakeGoogle(page);
  await signIn(page, "/ai-chat");

  await callFor(page, 32);

  await page.waitForTimeout(1_000);
  await expect(page.getByTestId("call-feedback-sheet")).toHaveCount(0);
});

test("Not now closes the question without sending anything", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { features: WITH_FEEDBACK }, overrides: voiceHandlers() });
  await fakeGoogle(page);
  await signIn(page, "/ai-chat");

  await callFor(page, 32);

  await expect(page.getByTestId("call-feedback-sheet")).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByTestId("call-feedback-sheet")).toHaveCount(0);
  expect(feedbackCalls(api)).toHaveLength(0);
});
