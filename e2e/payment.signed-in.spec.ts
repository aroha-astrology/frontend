import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Google Play is the only way to add money (Razorpay and coupons were removed
// on 2026-09-24). The e2e build is the web app, so it gets the Android-app
// notice instead of a payment button.
test("on the web, the wallet points to the Android app and has no coupon box", async ({ page }) => {
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
