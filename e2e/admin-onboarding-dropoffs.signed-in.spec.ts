import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/** The least the Overview page needs to draw itself; everything else on it copes with a 404. */
const OVERVIEW = {
  range: { from: "2026-09-18", to: "2026-10-17" },
  cashInPaise: 0,
  orderCount: 0,
  walletSpendPaise: 0,
  walletLiabilityPaise: 0,
  payingUsers: 0,
  arpuPaise: 0,
  newUsers: 0,
  activeUsers: 0,
  timeSeries: [],
  spendByFeature: [],
  topUpFunnel: [],
  llmCostByAgent: [],
};

const base = {
  displayName: null,
  phoneE164: null,
  lastActiveAt: null,
  platform: null,
  country: null,
  city: null,
};

const DROPOFFS = {
  days: 30,
  signedUp: 10,
  finished: 7,
  left: 3,
  likelyTest: 1,
  users: [
    { ...base, id: "real-1", email: "asha@example.com", signInMethod: "email", createdAt: "2026-10-08T18:24:14Z", minutesActive: 3, activeDays: 1, lastStep: "place", language: "en", platform: "android", country: "India", city: "Pune", likelyTest: null },
    { ...base, id: "bot-1", email: "janedoe.10001@gmail.com", signInMethod: "email", createdAt: "2026-10-14T09:11:12Z", minutesActive: 3, activeDays: 1, lastStep: "name", language: "ja", likelyTest: "play_review" },
    { ...base, id: "real-2", email: null, phoneE164: "+919800000000", signInMethod: "phone", createdAt: "2026-10-01T10:00:00Z", minutesActive: 20, activeDays: 3, lastStep: null, language: null, likelyTest: null },
  ],
};

const ADMIN_API: Handlers = {
  "GET /v1/admin/overview": () => ({ json: OVERVIEW }),
  "GET /v1/admin/onboarding-dropoffs": () => ({ json: DROPOFFS }),
};

test.describe("Admin → Overview → Left during onboarding", () => {
  test("lists who left and where, hiding Google's test devices until asked", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { isAdmin: true }, overrides: ADMIN_API });
    await signIn(page, "/admin");

    const card = page.getByTestId("admin-onboarding-dropoffs");
    await expect(card.getByRole("heading", { name: "Left during onboarding" })).toBeVisible();
    await expect(card.getByTestId("dropoffs-real-left")).toHaveText("2");

    await expect(card.getByTestId("dropoff-row-real-1")).toContainText("5 · Birth place");
    await expect(card.getByTestId("dropoff-row-real-1")).toContainText("Pune, India");
    await expect(card.getByTestId("dropoff-row-real-2")).toContainText("Not recorded");
    await expect(card.getByTestId("dropoff-row-real-2")).toContainText("Yes, 3 days");
    await expect(card.getByTestId("dropoff-row-bot-1")).toHaveCount(0);

    await card.getByLabel("Hide Google test devices").uncheck();
    await expect(card.getByTestId("dropoff-row-bot-1")).toContainText("Likely Google test device");

    expect(callsTo(api, "GET /v1/admin/onboarding-dropoffs")[0]!.query.get("days")).toBe("30");
    await card.getByRole("button", { name: "7 days" }).click();
    await expect.poll(() => callsTo(api, "GET /v1/admin/onboarding-dropoffs").at(-1)!.query.get("days")).toBe("7");
  });
});

test.describe("Onboarding saves the question reached", () => {
  test("sends only the step name as the reader moves on, never an answer", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { profileCompletedAt: null, dateOfBirth: null, timeOfBirth: null, placeOfBirth: null, displayName: null },
    });
    await signIn(page, "/onboarding");

    const steps = () =>
      callsTo(api, "PATCH /v1/me")
        .map((c) => (c.body as { onboardingStep?: string }).onboardingStep)
        .filter(Boolean);

    await expect.poll(steps).toEqual(["language"]);
    const first = callsTo(api, "PATCH /v1/me").find((c) => (c.body as { onboardingStep?: string }).onboardingStep);
    expect(first!.body).toEqual({ onboardingStep: "language", platform: "web" });

    await page.getByRole("button", { name: /English/ }).first().click();
    await expect.poll(steps).toEqual(["language", "name"]);

    await page.getByPlaceholder(/name/i).fill("Asha");
    await page.keyboard.press("Enter");
    await expect.poll(steps).toEqual(["language", "name", "dob"]);

    const sentKeys = callsTo(api, "PATCH /v1/me").flatMap((c) => Object.keys(c.body as object));
    expect(sentKeys).not.toContain("displayName");
  });
});
