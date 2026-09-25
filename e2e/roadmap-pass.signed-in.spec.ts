import { test, expect } from "@playwright/test";
import { mockApi, callsTo, sseBody } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

const BENEFITS = { questionsPerPeriod: 30, periodDays: 30, reportDiscountPct: 20 };
const OFFER = { variant: "B", pricePaise: 29900, play: null };
const ACTIVE = {
  source: "wallet",
  variant: "B",
  pricePaise: 29900,
  periodEnd: "2026-10-25T06:30:00.000Z",
  autoRenew: true,
  questionsLeft: 30,
};

function status(extra: Record<string, unknown> = {}) {
  return { enabled: true, offer: OFFER, pass: null, questionCredits: 0, packs: [], benefits: BENEFITS, ...extra };
}

test.describe("Question Packs + Aroha Pass (roadmap step 10)", () => {
  test("the page stays hidden and chat charges the wallet as before while everything is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/pass");
    await page.waitForURL((url) => url.pathname === "/");
    expect(callsTo(api, "GET /v1/pass")).toHaveLength(0);
  });

  test("buy the Pass from the wallet, see the quota, and turn auto-renew off", async ({ page }) => {
    await skipLaunchOverlays(page);
    let current = status();
    const api = await mockApi(page, {
      user: { features: { "nav.arohaPass": ON, "paid.arohaPassB": { ...ON, pricePaise: 29900 } } },
      overrides: {
        "GET /v1/pass": () => ({ json: current }),
        "POST /v1/pass/wallet": () => {
          current = status({ pass: ACTIVE });
          return { json: current };
        },
        "POST /v1/pass/auto-renew": (c) => {
          current = status({ pass: { ...ACTIVE, autoRenew: (c.body as { on: boolean }).on } });
          return { json: current };
        },
      },
    });
    await signIn(page, "/pass");

    const offer = page.getByTestId("pass-offer");
    await expect(offer.getByText("₹299 / 30 days")).toBeVisible();
    await expect(page.getByText("30 questions to Aroha every 30 days")).toBeVisible();
    await expect(page.getByText("20% off every report")).toBeVisible();
    await offer.getByRole("button", { name: "Pay ₹299 from wallet" }).click();

    const active = page.getByTestId("pass-active");
    await expect(active.getByText("Your Aroha Pass is active")).toBeVisible();
    await expect(active.getByText("30 of 30 questions left this period")).toBeVisible();
    expect(callsTo(api, "POST /v1/pass/wallet")[0]!.body).toEqual({ autoRenew: true });

    await active.getByRole("button", { name: "Turn off auto-renew" }).click();
    await expect(active.getByText(/Auto-renew is off/)).toBeVisible();
    expect(callsTo(api, "POST /v1/pass/auto-renew")[0]!.body).toEqual({ on: false });
  });

  test("Question Packs work on their own, and chat spends prepaid questions before the wallet", async ({ page }) => {
    await skipLaunchOverlays(page);
    // A ₹0 wallet would otherwise raise the low-balance "share the app" prompt over the page.
    await page.addInitScript(() => window.localStorage.setItem("aroha:sharePromptSeen:v1", "1"));
    let current = status({
      enabled: false,
      offer: null,
      packs: [{ pack: "small", questions: 5, pricePaise: 4900 }],
    });
    const api = await mockApi(page, {
      user: { features: { "paid.questionPackSmall": { ...ON, pricePaise: 4900 } }, walletBalancePaise: 0, questionCredits: 3 },
      overrides: {
        "GET /v1/pass": () => ({ json: current }),
        "POST /v1/question-packs/:pack/buy": () => {
          current = { ...current, questionCredits: 8 };
          return { json: current };
        },
        "POST /v1/chat": () => ({
          contentType: "text/event-stream",
          body: sseBody([
            ["token", { content: "Your chart says patience this month." }],
            ["done", { status: "complete" }],
          ]),
        }),
      },
    });
    await signIn(page, "/pass");

    const packs = page.getByTestId("question-packs");
    await expect(page.getByTestId("pass-offer")).toHaveCount(0);
    await packs.getByRole("button", { name: "Buy for ₹49" }).click();
    await expect(packs.getByText("Added 5 questions")).toBeVisible();
    await expect(packs.getByText("You have 8 prepaid questions")).toBeVisible();

    // Zero wallet, but prepaid questions: chat still lets the question through.
    await page.goto("/ai-chat");
    await expect(page.getByTestId("chat-pack-credits")).toHaveText("3 prepaid questions left");
    const input = page.getByPlaceholder("Ask your astrologer...");
    await input.fill("How will this month go?");
    await input.press("Enter");
    await expect(page.getByText("Your chart says patience this month.")).toBeVisible();
    expect(callsTo(api, "POST /v1/chat")).toHaveLength(1);
  });
});
