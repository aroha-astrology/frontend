import { test, expect } from "@playwright/test";
import { mockApi, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Admin → Users: which look each user picked, when they can change it next, and a support button that
// gives the free change back.

function row(id: string, name: string, extra: Record<string, unknown>) {
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
    ...extra,
  };
}

const NEXT = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();

test("Admin → Users shows each user's look, the wait, and Reset wait clears it", async ({ page }) => {
  await skipLaunchOverlays(page);
  let users = [
    row("u-cosmic", "Asha Cosmic", { uiSkin: "MODERN_COSMIC", uiSkinNextChangeAt: NEXT }),
    row("u-classic", "Ravi Classic", { uiSkin: "CLASSIC_VEDIC", uiSkinNextChangeAt: null }),
    row("u-none", "Meera None", { uiSkin: null, uiSkinNextChangeAt: null }),
  ];
  const handlers: Handlers = {
    "GET /v1/admin/users": () => ({ json: { users, total: users.length, offset: 0, limit: 20 } }),
    "POST /v1/admin/users/:id/experience/reset": () => {
      users = users.map((u) => (u.id === "u-cosmic" ? { ...u, uiSkinNextChangeAt: null } : u));
      return { json: {} };
    },
  };
  const api = await mockApi(page, { user: { isAdmin: true }, overrides: handlers });
  await signIn(page, "/admin/users");

  const cells = page.getByTestId("look-cell");
  await expect(cells).toHaveCount(3);
  await expect(cells.nth(0)).toContainText("Modern Cosmic");
  await expect(cells.nth(0)).toContainText("can change");
  await expect(cells.nth(1)).toContainText("Classic Vedic");
  await expect(cells.nth(1)).not.toContainText("can change");
  await expect(cells.nth(2)).toHaveText("—");

  await cells.nth(0).getByRole("button", { name: "Reset wait" }).click();
  await expect(cells.nth(0)).not.toContainText("can change");
  expect(api.calls.filter((c) => c.method === "POST" && c.path === "/v1/admin/users/u-cosmic/experience/reset")).toHaveLength(1);
});
