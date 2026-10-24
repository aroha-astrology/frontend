import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Owner, 2026-10-24: admin can hand a user's (or everyone's) free palm reading back.

function userRow(id: string, name: string) {
  return {
    id,
    displayName: name,
    phoneE164: null,
    email: `${id}@example.com`,
    referralSource: null,
    walletBalancePaise: 0,
    createdAt: "2026-10-01T10:00:00.000Z",
    lastActiveAt: "2026-10-14T10:00:00.000Z",
    claimedAmountPaise: null,
    claimedAt: null,
    totalPaidPaise: 0,
    lastPaidAt: null,
    country: null,
    city: null,
    timeSpentTodaySec: 0,
    timeSpentYesterdaySec: 0,
    timeSpentWeekSec: 0,
    timeSpentMonthSec: 0,
    timeSpentYearSec: 0,
    voiceCalls: 0,
    voiceSeconds: 0,
    voiceRating: null,
    voiceLastCalls: [],
  };
}

const USERS = [userRow("u-asha", "Asha"), userRow("u-ravi", "Ravi")];

const API: Handlers = {
  "GET /v1/admin/users": () => ({ json: { users: USERS, total: USERS.length, offset: 0, limit: 20 } }),
  "POST /v1/admin/users/:id/palm-reset": (c) => ({ json: { userId: c.path.split("/")[4] } }),
  "POST /v1/admin/palm/reset-all": () => ({ json: { count: 2 } }),
};

test.describe("Admin → Users: reset the palm reading count", () => {
  test("one user: asks first, then calls the reset for that user only", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { isAdmin: true }, overrides: API });
    await signIn(page, "/admin/users");

    // Saying no changes nothing.
    page.once("dialog", (d) => void d.dismiss());
    await page.getByTestId("palm-reset-user").first().click();
    expect(callsTo(api, "POST /v1/admin/users/u-asha/palm-reset")).toHaveLength(0);

    page.once("dialog", (d) => {
      expect(d.message()).toContain("Asha");
      void d.accept();
    });
    await page.getByTestId("palm-reset-user").first().click();
    await expect.poll(() => callsTo(api, "POST /v1/admin/users/u-asha/palm-reset").length).toBe(1);
    await expect(page.getByTestId("palm-reset-note")).toHaveText("Palm count reset for Asha.");
    expect(callsTo(api, "POST /v1/admin/users/u-ravi/palm-reset")).toHaveLength(0);
  });

  test("everyone: asks first, then resets all accounts and says how many", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { isAdmin: true }, overrides: API });
    await signIn(page, "/admin/users");

    page.once("dialog", (d) => {
      expect(d.message()).toContain("EVERY user");
      void d.accept();
    });
    await page.getByTestId("palm-reset-all").click();
    await expect.poll(() => callsTo(api, "POST /v1/admin/palm/reset-all").length).toBe(1);
    await expect(page.getByTestId("palm-reset-note")).toHaveText("Palm count reset for 2 accounts.");
  });
});
