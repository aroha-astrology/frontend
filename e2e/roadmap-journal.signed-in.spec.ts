import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

function istDay(offset = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + offset * 86_400_000));
}

const TODAY = istDay();
const TODAY_ENTRY = {
  date: TODAY,
  mood: 3,
  energy: null,
  career: null,
  relationship: null,
  money: null,
  note: "Quiet day",
  events: [],
  snapshot: { maha: "Saturn", antar: "Mercury", moonSign: "Cancer", moonNakshatra: "Pushya", tara: 4 },
};
const OLDER = { ...TODAY_ENTRY, date: istDay(-3), mood: 5, note: "Got the offer", events: ["promotion"], snapshot: null };

const INSIGHTS = {
  total: 2,
  streak: 1,
  averages: { mood: 4, energy: null, career: null, relationship: null, money: null },
  eventsByArea: { career: 1 },
  byDasha: [],
  highlights: [{ kind: "dashaEvents", maha: "Saturn", antar: "Mercury", area: "career", count: 2 }],
};

const LIFE_EVENTS = {
  events: [
    { date: "2015-06-01", domain: "job_started" },
    { date: "2018-02-10", domain: "marriage" },
    { date: "2021-09-15", domain: "childbirth" },
  ],
};

test.describe("Astro Journal (roadmap step 8)", () => {
  test("the page and Home card stay hidden while the flags are off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/journal");
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByTestId("journal-card")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/journal")).toHaveLength(0);
  });

  test("Home's card logs just today's mood", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "home.journalPrompt": ON } },
      overrides: {
        "GET /v1/journal": () => ({ json: { today: TODAY, entries: [] } }),
        "PUT /v1/journal/:date": (c) => ({ json: { ...TODAY_ENTRY, ...(c.body as object) } }),
      },
    });
    await signIn(page, "/");

    const card = page.getByTestId("journal-card");
    await expect(card.getByText("How was today?")).toBeVisible();
    await card.getByRole("button", { name: "Mood: 4 of 5" }).click();
    await expect(card.getByText("Saved — thank you")).toBeVisible();
    await expect(card.getByRole("link", { name: /Open journal/ })).toHaveCount(0); // the page is still off

    const put = callsTo(api, `PUT /v1/journal/${TODAY}`);
    expect(put).toHaveLength(1);
    expect(put[0]!.body).toEqual({ mood: 4 });
  });

  test("the page saves a full check-in and shows patterns and history", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "nav.journal": ON, "home.birthTimeConfidence": ON } },
      overrides: {
        "GET /v1/journal": () => ({ json: { today: TODAY, entries: [TODAY_ENTRY, OLDER] } }),
        "GET /v1/journal/insights": () => ({ json: INSIGHTS }),
        "GET /v1/journal/life-events": () => ({ json: LIFE_EVENTS }),
        "PUT /v1/journal/:date": (c) => ({ json: { ...TODAY_ENTRY, ...(c.body as object) } }),
      },
    });
    await signIn(page, "/journal");

    const checkin = page.getByTestId("journal-checkin");
    await expect(checkin.getByText("Saturn–Mercury · Moon in Cancer · Pushya")).toBeVisible();
    await expect(checkin.getByPlaceholder(/What happened today/)).toHaveValue("Quiet day");

    await checkin.getByRole("button", { name: "Energy: 4 of 5" }).click();
    await checkin.getByRole("button", { name: /Something big happened/ }).click();
    await checkin.getByRole("button", { name: "Got promoted" }).click();
    await checkin.getByRole("button", { name: "Save" }).click();
    await expect(checkin.getByRole("button", { name: "Saved" })).toBeVisible();

    const put = callsTo(api, `PUT /v1/journal/${TODAY}`);
    expect(put).toHaveLength(1);
    expect(put[0]!.body).toMatchObject({ mood: 3, energy: 4, note: "Quiet day", events: ["promotion"] });

    const insights = page.getByTestId("journal-insights");
    await expect(insights.getByText("You marked 2 events in Career during your Saturn–Mercury period.")).toBeVisible();
    await expect(insights.getByText("A mirror for self-reflection, not proof.")).toBeVisible();
    await expect(insights.getByRole("link", { name: "Use these 3 events to check your birth time" })).toHaveAttribute("href", "/settings");

    await page.getByRole("button", { name: /Got the offer/ }).click();
    await expect(checkin.getByPlaceholder(/What happened today/)).toHaveValue("Got the offer");
  });

  test("Birth Time Confidence can pull the journal's life events into its form", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "nav.journal": ON, "home.birthTimeConfidence": ON } },
      overrides: {
        "GET /v1/journal/life-events": () => ({ json: LIFE_EVENTS }),
        "GET /v1/birth-time": () => ({
          json: {
            time: "14:30",
            accuracy: "approximate",
            source: null,
            confidence: { pct: 55, level: "medium", basis: "stated_approximate" },
            latest: null,
            pricePaise: 9900,
            freeWithPass: false,
          },
        }),
      },
    });
    await signIn(page, "/settings");

    await page.getByRole("button", { name: "Improve birth-time accuracy" }).click();
    await page.getByRole("button", { name: "Add 3 events from your journal" }).click();
    await expect(page.locator('input[type="date"]').nth(0)).toHaveValue("2015-06-01");
    await expect(page.locator('input[type="date"]').nth(2)).toHaveValue("2021-09-15");
    await expect(page.getByRole("button", { name: /Add .* events from your journal/ })).toHaveCount(0);
  });
});
