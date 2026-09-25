import { test, expect } from "@playwright/test";
import { mockApi, callsTo, sseBody } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

function structuredReply(lines: string[], explore?: { area: string; links: string[] }) {
  return () => ({
    contentType: "text/event-stream",
    body: sseBody([
      ["session_id", { sessionId: "11111111-1111-4111-8111-111111111111" }],
      ...(explore ? ([["explore", explore]] as [string, unknown][]) : []),
      ...lines.map((l, i) => ["token", { content: (i ? "\n" : "") + l }] as [string, unknown]),
      ["done", { status: "complete" }],
    ]),
  });
}

test.describe("Ask Aroha 2.0 + Talk to Aroha (roadmap step 5)", () => {
  test("with the flag off, ?voice=1 keeps the normal composer", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page);
    await signIn(page, "/ai-chat?voice=1");
    await expect(page.getByPlaceholder("Ask your astrologer...")).toBeVisible();
    await expect(page.getByTestId("voice-panel")).toHaveCount(0);
  });

  test("a structured reply renders as factor cards, with explore links and follow-up chips", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: {
        "POST /v1/chat": structuredReply(
          [
            "FACTOR: Current Dasha | Mercury period favours planning.",
            "FACTOR: Career house | 10th-house activity is high.",
            "FACTOR: Saturn | Saturn tests patience.",
            "MEANING: Stay put for now and prepare.",
            "TIMELINE: October to January.",
            "Ask next: Best months? | Job or business?",
          ],
          { area: "career", links: ["timeline", "calendar"] },
        ),
      },
    });
    await signIn(page, "/ai-chat");

    const input = page.getByPlaceholder("Ask your astrologer...");
    await input.fill("When will I get a promotion?");
    await input.press("Enter");

    const answer = page.getByTestId("structured-answer");
    await expect(answer.getByText("What stands out in your chart")).toBeVisible();
    await expect(answer.getByText("Mercury period favours planning.")).toBeVisible();
    await expect(answer.getByText("What this means")).toBeVisible();
    await expect(answer.getByText("Stay put for now and prepare.")).toBeVisible();
    await expect(answer.getByText("October to January.")).toBeVisible();
    await expect(page.getByText("FACTOR:")).toHaveCount(0);

    const explore = page.getByTestId("explore-links");
    await expect(explore.getByRole("link", { name: /Career on your life timeline/ })).toHaveAttribute(
      "href",
      "/timeline?area=career",
    );
    await expect(explore.getByRole("link", { name: /Best periods ahead/ })).toHaveAttribute("href", "/calendar");
    await expect(page.getByRole("button", { name: "Job or business?" })).toBeVisible();
  });

  test("voice mode sends the spoken question and reads the reply in the voice of its script", async ({ page }) => {
    await skipLaunchOverlays(page);
    // Stand-ins for the browser's speech APIs: the recognizer "hears" a
    // Bengali question, and speechSynthesis records what it was asked to say.
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__spoken = [];
      class FakeRecognition {
        lang = "";
        interimResults = false;
        maxAlternatives = 1;
        onresult: ((e: unknown) => void) | null = null;
        onerror: (() => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          setTimeout(() => {
            this.onresult?.({ results: [[{ transcript: "আমার চাকরি কেমন যাবে?" }]] });
            this.onend?.();
          }, 100);
        }
        stop() {
          this.onend?.();
        }
      }
      w.SpeechRecognition = FakeRecognition;
      // The real utterance rejects a voice that isn't a genuine SpeechSynthesisVoice.
      w.SpeechSynthesisUtterance = class {
        lang = "";
        voice: unknown = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(public text: string) {}
      };
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          getVoices: () => [{ lang: "bn-IN", name: "Bengali" }, { lang: "en-US", name: "English" }],
          speak: (u: { text: string; lang: string; onend?: () => void }) => {
            (w.__spoken as Array<{ text: string; lang: string }>).push({ text: u.text, lang: u.lang });
            setTimeout(() => u.onend?.(), 50);
          },
          cancel: () => {},
          onvoiceschanged: null,
        },
      });
    });
    const api = await mockApi(page, {
      user: { features: { "chat.voiceMode": ON } },
      overrides: {
        "POST /v1/chat": structuredReply([
          "FACTOR: দশা | বুধের দশা পরিকল্পনার পক্ষে।",
          "MEANING: এখন ধৈর্য ধরুন।",
          "TIMELINE: অক্টোবর থেকে জানুয়ারি।",
        ]),
      },
    });
    await signIn(page, "/ai-chat?voice=1");

    await expect(page.getByTestId("voice-panel")).toBeVisible();
    await expect(page.getByTestId("structured-answer").getByText("এখন ধৈর্য ধরুন।")).toBeVisible();
    const sent = callsTo(api, "POST /v1/chat");
    expect(sent).toHaveLength(1);
    expect(JSON.stringify(sent[0]!.body)).toContain("আমার চাকরি কেমন যাবে?");

    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __spoken: Array<{ lang: string }> }).__spoken))
      .toEqual([expect.objectContaining({ lang: "bn-IN" })]);
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: Array<{ text: string }> }).__spoken[0]!.text);
    expect(spoken.startsWith("এখন ধৈর্য ধরুন।")).toBe(true);
  });
});
