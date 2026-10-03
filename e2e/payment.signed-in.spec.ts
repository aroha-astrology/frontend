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
