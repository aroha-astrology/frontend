import { test, expect, type Page } from "@playwright/test";
import { mockApi, type ApiCall, type MockState } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * The end of a long call. The call's audio goes to a fake Google socket and the
 * microphone is Chromium's fake device; a "minute" here lasts a second and a
 * half (the client renews five seconds before the grant expires).
 */

test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
});

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const FEATURES = { "paid.voiceChat": { ...ON, pricePaise: 2000 } };

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const MINUTE_MS = 6_500;

/** A tenth of a second of silence, 24 kHz 16-bit, as Google sends the Baba's voice. */
const SILENCE = Buffer.alloc(4800).toString("base64");

const USER_LINE = "Baba ji, please tell me about my career and when things will get better for me. ";
const BABA_LINE =
  "Beta, your tenth lord sits well and Saturn rewards steady work, so the coming months ask for patience more than change. ";

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
  };
}

const extendCalls = (api: MockState): ApiCall[] => api.calls.filter((c) => c.path.endsWith("/extend"));
const endCalls = (api: MockState): ApiCall[] => api.calls.filter((c) => c.path.endsWith("/end"));

/** Answers the call the way Google does: setup, then a conversation that keeps going. */
async function fakeGoogle(page: Page, opts: { turnEveryMs?: number; repeat?: number; chunks?: number } = {}) {
  const user = USER_LINE.repeat(opts.repeat ?? 1);
  const baba = BABA_LINE.repeat(opts.repeat ?? 1);
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
        send({ serverContent: { inputTranscription: { text: user } } });
        for (let i = 0; i < (opts.chunks ?? 1); i++) {
          send({
            serverContent: {
              outputTranscription: { text: baba },
              modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: SILENCE } }] },
            },
          });
        }
        send({ serverContent: { turnComplete: true } });
      }, opts.turnEveryMs ?? 300);
    });
    ws.onClose(() => clearInterval(timer));
  });
}

async function talkFor(page: Page, api: MockState, minutes: number) {
  await page.getByRole("button", { name: "Start voice chat" }).click();
  await expect(page.getByRole("dialog", { name: "Voice Chat" })).toBeVisible();
  await expect.poll(() => extendCalls(api).length, { timeout: 90_000 }).toBeGreaterThanOrEqual(minutes);
}

test("the end of a long call reaches the server with its transcript, and the app carries on", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { features: FEATURES }, overrides: voiceHandlers() });
  // Long answers, as in a call of ten minutes or more: the transcript sent with
  // the end of the call is far over the 64 KB a keepalive request may carry.
  await fakeGoogle(page, { repeat: 12, chunks: 40, turnEveryMs: 250 });
  await signIn(page, "/ai-chat");

  await talkFor(page, api, 3);
  await page.getByRole("button", { name: "End call" }).click();
  await expect(page.getByRole("dialog", { name: "Voice Chat" })).toHaveCount(0);

  await expect.poll(() => endCalls(api).length).toBe(1);
  const sent = endCalls(api)[0]!.body as { transcript?: { role: string; content: string }[] };
  expect(JSON.stringify(sent).length).toBeGreaterThan(64 * 1024);
  expect(sent.transcript?.some((turn) => turn.role === "assistant" && turn.content.includes("Saturn"))).toBe(true);

  // And the screen is left usable: the menu opens and its links go somewhere.
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("link", { name: "Chat History" }).click();
  await expect(page).toHaveURL(/\/chat-history/);
});
