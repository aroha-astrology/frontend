import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Google Play refunds (backend billing/play-refunds.service.ts): what a buyer sees
// on the recharge screen, a report bought with refunded money, and the admin page.

const AMOUNTS = {
  "GET /v1/billing/top-up-amounts": () => ({
    json: {
      amounts: [{ id: "100_recharge", amountPaise: 10000, currency: "INR", label: "₹100", popular: true }],
      razorpayEnabled: true,
    },
  }),
};

test.describe("Google Play refunds", () => {
  test("the recharge screen says a refunded payment is taken back", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { overrides: AMOUNTS });
    await signIn(page, "/payment");

    await expect(page.getByTestId("refund-notice")).toHaveText(
      "If Google Play refunds a payment, the money it put in your wallet is taken back.",
    );
    await expect(page.getByTestId("refund-debt")).toHaveCount(0);
  });

  test("a wallet below zero shows what it owes, and a blocked account cannot pay", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { walletBalancePaise: -9410, purchasesBlocked: true },
      overrides: AMOUNTS,
    });
    await signIn(page, "/payment");

    await expect(page.getByText("−₹94.10").first()).toBeVisible();
    await expect(page.getByTestId("refund-debt")).toContainText("Your wallet owes ₹94.10");
    await expect(page.getByTestId("purchases-blocked")).toContainText("Payments are turned off");
    await expect(page.getByRole("button", { name: /^Pay ₹/ })).toBeDisabled();
    expect(callsTo(api, "POST /v1/billing/razorpay/order")).toHaveLength(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("a report bought with refunded money is locked until the wallet is paid back", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: { "GET /v1/reports/:id": () => ({ json: { status: "locked", owedPaise: 9410 } }) },
    });
    await signIn(page, "/reports/33333333-3333-4333-8333-333333333333");

    const locked = page.getByTestId("report-locked");
    await expect(locked).toContainText("This report is locked");
    await expect(locked).toContainText("₹94.10 to go");
    await expect(locked.getByRole("link", { name: "Add money" })).toHaveAttribute("href", "/payment");
  });
});

test.describe("Admin → Play Refunds", () => {
  const refund = {
    id: "r-1",
    kind: "top_up",
    productId: "100_recharge",
    googleOrderId: "GPA.3391-0000-0000-00001",
    userId: "a8dd9155-d966-49d5-b7bb-7490293ee378",
    userName: "Rutuja Kulkarni",
    amountPaise: 10000,
    questionCredits: 0,
    status: "recorded",
    clawedBackPaise: 0,
    clawedBackQuestions: 0,
    reportsLocked: 0,
    walletBalancePaise: 590,
    purchasesBlocked: false,
    voidedAt: "2026-10-17T10:00:00Z",
    purchasedAt: "2026-10-17T02:18:00Z",
    voidedReason: 1,
    voidedSource: 0,
    detectedVia: "voided_api",
    createdAt: "2026-10-24T08:15:00Z",
  };

  test("lists refunds, asks Google on demand and blocks an account", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await skipLaunchOverlays(page);
    let blocked = false;
    const api = await mockApi(page, {
      user: { isAdmin: true },
      overrides: {
        "GET /v1/admin/play-refunds": () => ({
          json: {
            clawbackOn: false,
            total: 1,
            page: 1,
            pageSize: 25,
            refunds: [{ ...refund, purchasesBlocked: blocked }],
          },
        }),
        "POST /v1/admin/play-refunds/check": () => ({
          json: { checked: 1, recorded: 0, clawedBack: 0, pass: 0, unmatched: 0, skipped: 0, notCredited: 0 },
        }),
        "POST /v1/admin/users/:id/purchases-block": (c) => {
          blocked = (c.body as { blocked: boolean }).blocked;
          return { json: { blocked } };
        },
      },
    });
    await signIn(page, "/admin/play-refunds");

    const card = page.getByTestId("play-refund-r-1");
    await expect(card).toContainText("Rutuja Kulkarni");
    await expect(card).toContainText("Recorded only (switch off)");
    await expect(card).toContainText("₹100 wallet money");
    await expect(card).toContainText("Changed their mind");
    await expect(page.getByTestId("clawback-switch")).toContainText("refunds are recorded only");

    await page.getByRole("button", { name: "Check now" }).click();
    await expect(page.getByTestId("check-result")).toContainText("Google listed 1 refunds");
    expect(callsTo(api, "POST /v1/admin/play-refunds/check")).toHaveLength(1);

    await card.getByRole("button", { name: "Block purchases" }).click();
    await expect(card).toContainText("Purchases blocked");
    expect(callsTo(api, `POST /v1/admin/users/${refund.userId}/purchases-block`)[0]!.body).toEqual({ blocked: true });
    await expect(card.getByRole("button", { name: "Unblock purchases" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
