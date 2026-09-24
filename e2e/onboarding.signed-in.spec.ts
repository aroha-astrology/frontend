import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

test("a new user from an invite link lands in onboarding with the code kept", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { profileCompletedAt: null, dateOfBirth: null, timeOfBirth: null, placeOfBirth: null, displayName: null },
  });
  await signIn(page, "/?ref=abc12");

  await page.waitForURL("**/onboarding");
  // ReferralCapture stashes it (upper-cased) before AuthGuard's redirect drops the query;
  // onboarding pre-fills it into the confirm step's referral field from here.
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("pending_referral_code")))
    .toBe("ABC12");
});
