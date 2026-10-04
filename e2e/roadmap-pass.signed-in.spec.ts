import { test, expect } from "@playwright/test";
import { mockApi, callsTo, passStatus, sseBody, PASS_OFFERS } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const PASS_ON = {
  "nav.arohaPass": ON,
  "paid.arohaPassA": { ...ON, pricePaise: 19900 },
  "paid.arohaPassB": { ...ON, pricePaise: 29900 },
  "paid.arohaPassC": { ...ON, pricePaise: 39900 },
};

/** A running Google Play Pass on one of the tiers. */
function activePlay(tier: "silver" | "gold" | "platinum", questionsLeft: number) {
  const offer = PASS_OFFERS.find((o) => o.tier === tier)!;
  return {
    tier,
    source: "google_play",
    variant: offer.variant,
    pricePaise: offer.pricePaise,
    periodEnd: "2026-10-25T06:30:00.000Z",
    autoRenew: true,
    questionsLeft,
    questionsPerPeriod: offer.questionsPerPeriod,
    reportDiscountPct: offer.reportDiscountPct,
    features: offer.features,
  };
}
const ACTIVE_PLAY = activePlay("gold", 27);

test.describe("Question Packs + Aroha Pass (roadmap step 10)", () => {
  test("the page stays hidden and chat charges the wallet as before while everything is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/pass");
    await page.waitForURL((url) => url.pathname === "/");
    expect(callsTo(api, "GET /v1/pass")).toHaveLength(0);
  });

  test("the Pass is Google Play only: no wallet button, and the web points to the Android app", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: PASS_ON, walletBalancePaise: 100_000 },
      overrides: { "GET /v1/pass": () => ({ json: passStatus() }) },
    });
    await signIn(page, "/pass");

    const tiers = page.getByTestId("pass-tiers");
    await expect(tiers.getByText("₹299 / 30 days")).toBeVisible();
    await expect(page.getByTestId("pass-android-only")).toContainText("Subscribe from the Aroha app on Android.");
    await expect(tiers.getByText("Paid through Google Play — never from your Aroha wallet.")).toBeVisible();
    // Plenty in the wallet, and still no way to pay for the Pass with it.
    await expect(page.getByRole("button", { name: /wallet/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Subscribe with Google Play" })).toHaveCount(0);
    await expect(page.getByText(/auto-renew/i)).toHaveCount(0);
    expect(callsTo(api, "POST /v1/pass/wallet")).toHaveLength(0);
  });

  test("the three Passes differ: each step up has more questions, a bigger report discount and more features", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus() }) },
    });
    await signIn(page, "/pass");

    await expect(page.getByTestId("pass-tiers").getByText("Choose your Pass")).toBeVisible();
    const included = (tier: string) => page.getByTestId(`pass-tier-${tier}`).getByRole("listitem").filter({ hasNotText: "Not included" });
    const missing = (tier: string) => page.getByTestId(`pass-tier-${tier}`).getByRole("listitem").filter({ hasText: "Not included" });

    const silver = page.getByTestId("pass-tier-silver");
    await expect(silver.getByText("Aroha Pass Silver")).toBeVisible();
    await expect(silver.getByText("₹199 / 30 days")).toBeVisible();
    await expect(included("silver")).toHaveText([
      "15 questions to Aroha every 30 days",
      "10% off every report",
      "Your whole-life Life Timeline",
      "Detailed insight for every bond",
    ]);
    await expect(missing("silver")).toHaveText([
      /Decision Astrology and Find My Date results/,
      /Birth-time checks/,
      /Aroha Relocation city comparisons/,
    ]);

    const gold = page.getByTestId("pass-tier-gold");
    await expect(gold.getByText("Aroha Pass Gold")).toBeVisible();
    await expect(gold.getByText("₹299 / 30 days")).toBeVisible();
    await expect(gold.getByText("Recommended")).toBeVisible();
    await expect(included("gold")).toHaveText([
      "30 questions to Aroha every 30 days",
      "20% off every report",
      "Your whole-life Life Timeline",
      "Detailed insight for every bond",
      "Decision Astrology and Find My Date results",
      "Birth-time checks",
    ]);
    await expect(missing("gold")).toHaveText([/Aroha Relocation city comparisons/]);

    const platinum = page.getByTestId("pass-tier-platinum");
    await expect(platinum.getByText("Aroha Pass Platinum")).toBeVisible();
    await expect(platinum.getByText("₹399 / 30 days")).toBeVisible();
    await expect(included("platinum")).toHaveText([
      "60 questions to Aroha every 30 days",
      "30% off every report",
      "Your whole-life Life Timeline",
      "Detailed insight for every bond",
      "Decision Astrology and Find My Date results",
      "Birth-time checks",
      "Aroha Relocation city comparisons",
    ]);
    await expect(missing("platinum")).toHaveCount(0);
  });

  test("a Silver subscriber sees what their Pass leaves out and how to move up", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus({ pass: activePlay("silver", 9) }) }) },
    });
    await signIn(page, "/pass");

    const active = page.getByTestId("pass-active");
    await expect(active.getByText("Your Aroha Pass Silver is active")).toBeVisible();
    await expect(active.getByText("9 of 15 questions left this period")).toBeVisible();
    await expect(page.getByTestId("pass-included").getByText("10% off every report")).toBeVisible();

    await expect(page.getByTestId("pass-tiers").getByText("Compare the Passes")).toBeVisible();
    await expect(page.getByTestId("pass-tier-silver").getByText("Your Pass")).toBeVisible();
    await expect(page.getByTestId("pass-tier-gold").getByText("Recommended")).toHaveCount(0);
    // The web can't change a Play subscription; it says where to do it.
    await expect(page.getByTestId("pass-change")).toContainText("Move to a higher Pass from the Aroha app on Android.");
    await expect(page.getByRole("button", { name: /Upgrade to/ })).toHaveCount(0);
  });

  test("a Pass that comes free with the account shows no end date and nothing to pay", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({
          json: passStatus({
            pass: { ...activePlay("platinum", 60), source: "group", variant: null, pricePaise: 0 },
          }),
        }),
      },
    });
    await signIn(page, "/pass");

    const active = page.getByTestId("pass-active");
    await expect(active.getByText("Your Aroha Pass Platinum is active")).toBeVisible();
    await expect(active.getByText("60 of 60 questions left this period")).toBeVisible();
    await expect(active.getByText("Included with your account. Nothing to pay.")).toBeVisible();
    await expect(active.getByText(/^Until /)).toHaveCount(0);
    await expect(active.getByText(/Subscribe with Google Play/)).toHaveCount(0);
    await expect(page.getByTestId("pass-tier-platinum").getByText("Your Pass")).toBeVisible();
  });

  test("an active Google Play Pass shows its renewal date, questions left and where to manage it", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus({ pass: ACTIVE_PLAY }) }) },
    });
    await signIn(page, "/pass");

    const active = page.getByTestId("pass-active");
    await expect(active.getByText("Your Aroha Pass Gold is active")).toBeVisible();
    await expect(active.getByText(/^Renews on /)).toBeVisible();
    await expect(active.getByText("27 of 30 questions left this period")).toBeVisible();
    await expect(active.getByText(/Google Play subscription · Auto-renew is on/)).toBeVisible();
    await expect(active.getByRole("link", { name: "Manage in Google Play" })).toHaveAttribute(
      "href",
      /play\.google\.com\/store\/account\/subscriptions/,
    );
  });

  test("the payment page shows the subscription: the offer, then the running Pass", async ({ page }) => {
    await skipLaunchOverlays(page);
    let current = passStatus();
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({ json: current }),
        "GET /v1/billing/top-up-amounts": () => ({ json: { amounts: [] } }),
      },
    });
    await signIn(page, "/payment");

    const card = page.getByTestId("pass-summary");
    await expect(card.getByText("Subscription")).toBeVisible();
    await expect(card.getByText("From ₹199 / 30 days")).toBeVisible();
    await expect(card.getByText(/up to 60 questions to Aroha every 30 days/)).toBeVisible();
    await expect(card.getByText("Paid through Google Play — never from your Aroha wallet.")).toBeVisible();
    await expect(card.getByRole("link", { name: "See the Aroha Pass" })).toHaveAttribute("href", "/pass");

    current = passStatus({ pass: ACTIVE_PLAY });
    await page.reload();
    await expect(card.getByText("Active", { exact: true })).toBeVisible();
    await expect(card.getByText("27 of 30 questions left this period")).toBeVisible();
    await expect(card.getByRole("link", { name: "Manage in Google Play" })).toBeVisible();
  });

  test("Question Packs work on their own, and chat spends prepaid questions before the wallet", async ({ page }) => {
    await skipLaunchOverlays(page);
    // A ₹0 wallet would otherwise raise the low-balance "share the app" prompt over the page.
    await page.addInitScript(() => window.localStorage.setItem("aroha:sharePromptSeen:v1", "1"));
    let current = passStatus({
      enabled: false,
      offers: [],
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
    await expect(page.getByTestId("pass-tiers")).toHaveCount(0);
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

  test("a failed pack purchase doesn't claim the questions were added", async ({ page }) => {
    await skipLaunchOverlays(page);
    await page.addInitScript(() => window.localStorage.setItem("aroha:sharePromptSeen:v1", "1"));
    await mockApi(page, {
      user: { features: { "paid.questionPackSmall": { ...ON, pricePaise: 4900 } }, walletBalancePaise: 0 },
      overrides: {
        "GET /v1/pass": () => ({
          json: passStatus({ enabled: false, offers: [], packs: [{ pack: "small", questions: 5, pricePaise: 4900 }] }),
        }),
        "POST /v1/question-packs/:pack/buy": () => ({
          status: 409,
          json: { error: { code: "CONFLICT", message: "INSUFFICIENT_CREDITS" } },
        }),
      },
    });
    await signIn(page, "/pass");

    await page.getByTestId("question-packs").getByRole("button", { name: "Buy for ₹49" }).click();
    await expect(page.getByText("Not enough money in your wallet.")).toBeVisible();
    await expect(page.getByText("Added 5 questions")).toHaveCount(0);
  });
});
