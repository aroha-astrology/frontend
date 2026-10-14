import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

function userRow(id: string, name: string, voice: { calls: number; seconds: number; rating: number | null }) {
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
    voiceCalls: voice.calls,
    voiceSeconds: voice.seconds,
    voiceRating: voice.rating,
  };
}

const USERS = [
  userRow("u-caller", "Asha Caller", { calls: 3, seconds: 754, rating: 4.5 }),
  userRow("u-quiet", "Ravi Quiet", { calls: 0, seconds: 0, rating: null }),
];

const FEEDBACK = {
  feedback: [
    {
      voiceSessionId: "s-1",
      userId: "u-caller",
      displayName: "Asha Caller",
      phoneE164: null,
      rating: 2,
      tags: ["callCut", "hardToHear"],
      comment: "It stopped in the middle",
      minutesCharged: 3,
      callStartedAt: "2026-10-14T10:00:00.000Z",
      callEndedAt: "2026-10-14T10:02:31.000Z",
      feedbackAt: "2026-10-14T10:03:00.000Z",
    },
  ],
  total: 1,
  averageRating: 2,
  offset: 0,
  limit: 200,
};

const ADMIN_API: Handlers = {
  "GET /v1/admin/users": () => ({ json: { users: USERS, total: USERS.length, offset: 0, limit: 20 } }),
  "GET /v1/admin/voice-feedback": () => ({ json: FEEDBACK }),
};

test("Admin → Users shows who used voice calls, for how long, and sorts by it", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { isAdmin: true }, overrides: ADMIN_API });
  await signIn(page, "/admin/users");

  const cells = page.getByTestId("voice-calls-cell");
  await expect(cells).toHaveCount(2);
  await expect(cells.nth(0)).toHaveText(/12m\s*3 calls · ★ 4\.5/);
  await expect(cells.nth(1)).toHaveText("—");

  await page.getByRole("button", { name: "Voice Calls" }).click();
  await expect
    .poll(() => callsTo(api, "GET /v1/admin/users").some((c) => c.query.get("sortBy") === "voiceSeconds"))
    .toBe(true);
});

test("Admin → Call Feedback lists every answer with the average", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { isAdmin: true }, overrides: ADMIN_API });
  await signIn(page, "/admin/call-feedback");

  await expect(page.getByTestId("call-feedback-summary")).toHaveText("★ 2 average from 1 answer");
  const row = page.getByRole("row", { name: /Asha Caller/ });
  await expect(row).toContainText("★★☆☆☆");
  await expect(row).toContainText("Call cut off, Hard to hear");
  await expect(row).toContainText("It stopped in the middle");
  await expect(row).toContainText("2m 31s");
});
