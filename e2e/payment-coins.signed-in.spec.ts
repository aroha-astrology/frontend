import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Aroha Coins on the payment screen (switches money.coins, money.coinPacks, money.razorpayIntl).
// Wallet amounts are written as coins; the price of a pack is always REAL money in the buyer's
// currency; the website asks Razorpay for the real charge in that currency.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

type Listing = {
  amounts: Array<Record<string, unknown>>;
  razorpayEnabled: boolean;
  coinPacks: boolean;
  currency: string;
  currencies: string[];
};

const PRICES: Record<string, number[]> = {
  INR: [9900, 29900, 59900, 149900],
  USD: [199, 499, 999, 1999],
  EUR: [199, 499, 999, 1999],
  GBP: [179, 449, 899, 1799],
};
const LABELS: Record<string, string[]> = {
  INR: ["₹99", "₹299", "₹599", "₹1499"],
  USD: ["$1.99", "$4.99", "$9.99", "$19.99"],
  EUR: ["€1.99", "€4.99", "€9.99", "€19.99"],
  GBP: ["£1.79", "£4.49", "£8.99", "£17.99"],
};

/** The pack list the way the server answers it for a coin-pack user, in the currency asked for. */
function coinListing(currency: string): Listing {
  const ids = ["coins_100", "coins_330", "coins_700", "coins_1800"];
  const coins = [100, 330, 700, 1800];
  const bonus = [0, 30, 100, 300];
  const names = ["Starter Pack", "Popular Pack", "Seeker Pack", "Royal Vault"];
  return {
    amounts: ids.map((id, i) => ({
      id,
      amountPaise: PRICES[currency]![i]!,
      currency,
      label: LABELS[currency]![i]!,
      bonusPaise: bonus[i]! * 100,
      coins: coins[i]!,
      name: names[i]!,
      ...(id === "coins_330" ? { popular: true } : {}),
    })),
    razorpayEnabled: true,
    coinPacks: true,
    currency,
    currencies: ["INR", "USD", "EUR", "GBP"],
  };
}

/** Stand-in for checkout.js: records how it was opened, then "pays" at once. */
async function fakeRazorpay(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    (window as unknown as { Razorpay: unknown }).Razorpay = function (opts: {
      order_id: string;
      amount: number;
      currency: string;
      handler: (r: object) => void;
    }) {
      (window as unknown as { __rzpOpts: unknown }).__rzpOpts = { amount: opts.amount, currency: opts.currency };
      return {
        on: () => {},
        open: () =>
          opts.handler({ razorpay_payment_id: "pay_e2e", razorpay_order_id: opts.order_id, razorpay_signature: "sig_e2e" }),
      };
    };
  });
}

test.describe("coins on the payment screen", () => {
  test("with only money.coins on, balances are coins but a pack's price stays real rupees", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "money.coins": ON } },
      overrides: {
        "GET /v1/billing/top-up-amounts": () => ({
          json: {
            amounts: [
              { id: "100_recharge", amountPaise: 10000, currency: "INR", label: "₹100" },
              { id: "recharge_250", amountPaise: 25000, bonusPaise: 10000, currency: "INR", label: "₹250", popular: true },
            ],
            razorpayEnabled: true,
          },
        }),
      },
    });
    await signIn(page, "/payment");

    // The wallet is written in coins (the e2e user holds 50,000 paise = 500 coins).
    await expect(page.getByText("🪙 500").first()).toBeVisible();
    // What a pack costs is real money, in rupees; what it gives is coins.
    await expect(page.getByText("₹250").first()).toBeVisible();
    await expect(page.getByText("Get 🪙 350")).toBeVisible();
    // The popular pack is pre-selected, and the button names its real price.
    await expect(page.getByRole("button", { name: /^Pay ₹250/ })).toBeVisible();
  });

  test("the coin packs show coins for what you get and real money for the price", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "money.coins": ON, "money.coinPacks": ON, "money.razorpayIntl": ON } },
      overrides: {
        "GET /v1/billing/top-up-amounts": (c) => ({ json: coinListing(c.query.get("currency") ?? "USD") }),
      },
    });
    await signIn(page, "/payment");

    const popular = page.getByTestId("pack-coins_330");
    await expect(popular).toContainText("🪙 330");
    await expect(page.getByTestId("price-coins_330")).toHaveText("$4.99");
    await expect(popular).toContainText("Popular Pack");
    await expect(popular).toContainText("+🪙 30 bonus");
    await expect(page.getByTestId("pack-coins_100")).toContainText("🪙 100");
    await expect(page.getByTestId("pack-coins_100")).not.toContainText("bonus");
    await expect(page.getByTestId("price-coins_1800")).toHaveText("$19.99");
    // Nothing on the packs or the totals says rupees to a dollar buyer.
    await expect(page.getByTestId("pack-coins_700")).not.toContainText("₹");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("choosing another currency requotes the packs from the server", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "money.coins": ON, "money.coinPacks": ON, "money.razorpayIntl": ON } },
      overrides: {
        "GET /v1/billing/top-up-amounts": (c) => ({ json: coinListing(c.query.get("currency") ?? "USD") }),
      },
    });
    await signIn(page, "/payment");

    const chips = page.getByTestId("pay-currency");
    await expect(chips.getByRole("button", { name: "USD", pressed: true })).toBeVisible();
    await chips.getByRole("button", { name: "EUR" }).click();
    await expect(page.getByTestId("price-coins_330")).toHaveText("€4.99");
    await expect(chips.getByRole("button", { name: "EUR", pressed: true })).toBeVisible();
    await chips.getByRole("button", { name: "INR" }).click();
    await expect(page.getByTestId("price-coins_330")).toHaveText("₹299");

    const asked = callsTo(api, "GET /v1/billing/top-up-amounts").map((c) => c.query.get("currency"));
    expect(asked).toEqual([null, "EUR", "INR"]);
  });

  test("paying in dollars asks Razorpay for $4.99, not the rupee price, and the success screen counts coins", async ({ page }) => {
    await skipLaunchOverlays(page);
    await fakeRazorpay(page);
    const order = {
      id: "22222222-2222-4222-8222-222222222222",
      finalAmountPaise: 29900,
      chargedMinor: 499,
      currency: "USD",
    };
    const api = await mockApi(page, {
      user: { features: { "money.coins": ON, "money.coinPacks": ON, "money.razorpayIntl": ON } },
      overrides: {
        "GET /v1/billing/top-up-amounts": (c) => ({ json: coinListing(c.query.get("currency") ?? "USD") }),
        "POST /v1/billing/razorpay/order": () => ({
          json: { order, razorpayOrderId: "order_e2e", razorpayKeyId: "rzp_test_e2e" },
        }),
        "POST /v1/billing/razorpay/verify": () => ({ json: { order, walletBalancePaise: 83_000 } }),
      },
    });
    await signIn(page, "/payment");

    await page.getByTestId("pack-coins_330").click();
    const pay = page.getByRole("button", { name: "Pay $4.99" });
    await expect(pay).toBeEnabled();
    await pay.click();

    await expect(page.getByText(/Payment Successful/)).toBeVisible();
    // The wallet gets the pack's coins, not its dollar price.
    await expect(page.getByText(/🪙 330 has been added to your wallet/)).toBeVisible();
    expect(callsTo(api, "POST /v1/billing/razorpay/order")[0]!.body).toEqual({ packId: "coins_330", currency: "USD" });
    const opened = await page.evaluate(() => (window as unknown as { __rzpOpts: unknown }).__rzpOpts);
    expect(opened).toEqual({ amount: 499, currency: "USD" });
  });
});
