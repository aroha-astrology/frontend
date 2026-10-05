import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { E2EUser } from "./fixtures/data";

/**
 * The first in-app rating earns a one-time wallet credit. The rating sheet
 * says so, with the admin-set amount, only to someone who will get it.
 */

async function openSheet(page: Page, user: Partial<E2EUser>) {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user,
    overrides: {
      "POST /v1/feedback": (_call, state) => {
        // What the backend does on a first rating: marks it given and pays the wallet.
        state.user = { ...state.user, feedbackGiven: true, walletBalancePaise: 55_000 };
        return { status: 201, json: { id: "f1", received: true } };
      },
    },
  });
  await signIn(page, "/settings");
  await page.getByRole("button", { name: "Send Feedback" }).click();
  await expect(page.getByRole("heading", { name: "Rate Aroha Astrology" })).toBeVisible();
  return api;
}

test.describe("Rating sheet reward", () => {
  test("someone who has not rated yet is told about the credit and thanked with it", async ({ page }) => {
    const api = await openSheet(page, { feedbackGiven: false });
    await expect(page.getByTestId("feedback-reward")).toHaveText(
      "Rate your experience and we'll add ₹50 to your wallet.",
    );

    await page.getByRole("button", { name: "Rate 4 out of 5" }).click();
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page.getByTestId("feedback-thanks")).toHaveText("Thank you! ₹50 has been added to your wallet.");
    expect(callsTo(api, "POST /v1/feedback")[0]!.body).toEqual({ rating: 4 });
    // The balance is fetched again, so the top bar shows the credit.
    await expect(page.getByTestId("topbar-row")).toContainText("₹550");
  });

  test("the line quotes the amount set in admin", async ({ page }) => {
    await openSheet(page, {
      feedbackGiven: false,
      features: { "referral.feedbackReward": { enabled: true, pricePaise: 7500, originalPricePaise: null } },
    });
    await expect(page.getByTestId("feedback-reward")).toHaveText(
      "Rate your experience and we'll add ₹75 to your wallet.",
    );
  });

  test("someone who already rated is promised nothing", async ({ page }) => {
    await openSheet(page, { feedbackGiven: true });
    await expect(page.getByText("How would you rate your experience?")).toBeVisible();
    await expect(page.getByTestId("feedback-reward")).toHaveCount(0);

    await page.getByRole("button", { name: "Rate 5 out of 5" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByTestId("feedback-thanks")).toHaveText("Thank you for your feedback!");
  });

  test("nothing is promised while the reward is switched off in admin", async ({ page }) => {
    await openSheet(page, {
      feedbackGiven: false,
      features: { "referral.feedbackReward": { enabled: false, pricePaise: 5000, originalPricePaise: null } },
    });
    await expect(page.getByText("How would you rate your experience?")).toBeVisible();
    await expect(page.getByTestId("feedback-reward")).toHaveCount(0);
  });
});
