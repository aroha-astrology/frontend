import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Google Play pays inside the Android app; the web pays with Razorpay when the
// server has keys. Coupons stay off everywhere. With no Razorpay keys the web
// falls back to a notice pointing at the Android app.
test("on the web without Razorpay keys, the wallet points to the Android app and has no coupon box", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: {
      "GET /v1/billing/top-up-amounts": () => ({
        json: {
          amounts: [
            { id: "recharge_250", amountPaise: 25000, currency: "INR", label: "₹250", popular: true },
            { id: "recharge_500", amountPaise: 50000, currency: "INR", label: "₹500" },
          ],
        },
      }),
    },
  });
  await signIn(page, "/payment");

  await expect(page.getByText(/Adding money works in the Aroha app for Android/)).toBeVisible();
  const playLink = page.getByRole("link", { name: /Get the Android app/ });
  await expect(playLink).toHaveAttribute("href", /play\.google\.com\/store\/apps\/details\?id=com\.aroha\.astrology/);
  await expect(page.getByPlaceholder(/coupon/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Pay ₹/ })).toBeDisabled();
  expect(callsTo(api, "POST /v1/billing/checkout")).toHaveLength(0);
});

test("on the web with Razorpay, paying creates an order, opens checkout and verifies the payment", async ({ page }) => {
  await skipLaunchOverlays(page);
  // Stand-in for checkout.js: "pays" the moment it is opened.
  await page.addInitScript(() => {
    (window as unknown as { Razorpay: unknown }).Razorpay = function (opts: {
      order_id: string;
      handler: (r: object) => void;
    }) {
      return {
        on: () => {},
        open: () =>
          opts.handler({
            razorpay_payment_id: "pay_e2e",
            razorpay_order_id: opts.order_id,
            razorpay_signature: "sig_e2e",
          }),
      };
    };
  });
  const order = { id: "11111111-1111-4111-8111-111111111111", finalAmountPaise: 25000, currency: "INR" };
  const api = await mockApi(page, {
    overrides: {
      "GET /v1/billing/top-up-amounts": () => ({
        json: {
          amounts: [
            { id: "recharge_250", amountPaise: 25000, currency: "INR", label: "₹250", popular: true },
            { id: "recharge_500", amountPaise: 50000, currency: "INR", label: "₹500" },
          ],
          razorpayEnabled: true,
        },
      }),
      "POST /v1/billing/razorpay/order": () => ({
        json: { order, razorpayOrderId: "order_e2e", razorpayKeyId: "rzp_test_e2e" },
      }),
      "POST /v1/billing/razorpay/verify": () => ({ json: { order, walletBalancePaise: 25000 } }),
    },
  });
  await signIn(page, "/payment");

  await expect(page.getByText(/Adding money works in the Aroha app for Android/)).toHaveCount(0);
  await expect(page.getByPlaceholder(/coupon/i)).toHaveCount(0);
  const pay = page.getByRole("button", { name: /^Pay ₹250/ });
  await expect(pay).toBeEnabled();
  await pay.click();

  await expect(page.getByText(/Payment Successful/)).toBeVisible();
  expect(callsTo(api, "POST /v1/billing/razorpay/order")[0]!.body).toEqual({ packId: "recharge_250" });
  expect(callsTo(api, "POST /v1/billing/razorpay/verify")[0]!.body).toEqual({
    orderId: order.id,
    razorpayOrderId: "order_e2e",
    razorpayPaymentId: "pay_e2e",
    razorpaySignature: "sig_e2e",
  });
  // The Play path is never touched in a browser.
  expect(callsTo(api, "POST /v1/billing/checkout")).toHaveLength(0);
});

// Owner's offer (2026-10-17): pay ₹250 get ₹350, pay ₹500 get ₹750. The server
// sends bonusPaise; packs without it show only their price.
test("the ₹250 and ₹500 packs show what lands in the wallet, and the success screen says the full amount", async ({ page }) => {
  await skipLaunchOverlays(page);
  await page.addInitScript(() => {
    (window as unknown as { Razorpay: unknown }).Razorpay = function (opts: {
      order_id: string;
      handler: (r: object) => void;
    }) {
      return {
        on: () => {},
        open: () =>
          opts.handler({ razorpay_payment_id: "pay_e2e", razorpay_order_id: opts.order_id, razorpay_signature: "sig_e2e" }),
      };
    };
  });
  const order = { id: "11111111-1111-4111-8111-111111111111", finalAmountPaise: 25000, currency: "INR" };
  await mockApi(page, {
    overrides: {
      "GET /v1/billing/top-up-amounts": () => ({
        json: {
          amounts: [
            { id: "100_recharge", amountPaise: 10000, currency: "INR", label: "₹100" },
            { id: "recharge_250", amountPaise: 25000, bonusPaise: 10000, currency: "INR", label: "₹250", popular: true },
            { id: "recharge_500", amountPaise: 50000, bonusPaise: 25000, currency: "INR", label: "₹500" },
          ],
          razorpayEnabled: true,
        },
      }),
      "POST /v1/billing/razorpay/order": () => ({
        json: { order, razorpayOrderId: "order_e2e", razorpayKeyId: "rzp_test_e2e" },
      }),
      "POST /v1/billing/razorpay/verify": () => ({ json: { order, walletBalancePaise: 35000 } }),
    },
  });
  await signIn(page, "/payment");

  const pack = (price: string) => page.getByRole("button").filter({ hasText: new RegExp(`^(Popular)?\\s*${price}`) });
  await expect(pack("₹250")).toContainText("Get ₹350");
  await expect(pack("₹250")).toContainText("+₹100 extra");
  await expect(pack("₹500")).toContainText("Get ₹750");
  await expect(pack("₹500")).toContainText("+₹250 extra");
  await expect(pack("₹100")).toHaveText("₹100");

  // ₹250 is preselected (popular): you pay ₹250, the wallet gets ₹350.
  await expect(page.getByText("Added to your wallet")).toBeVisible();
  await page.getByRole("button", { name: /^Pay ₹250/ }).click();
  await expect(page.getByText("₹350 has been added to your wallet.")).toBeVisible();
});
