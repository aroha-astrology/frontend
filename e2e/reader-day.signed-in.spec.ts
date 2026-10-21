import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// A reader abroad lives on their own day: at 20:00 on 20 Oct in New York it is
// already 21 Oct in India, and the journal, practice and calendar must still
// say 20 Oct. The app sends the device zone so the server agrees.
test.use({ timezoneId: "America/New_York" });

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const NY_EVENING = new Date("2026-10-21T00:00:00Z");

test("Home's journal card logs the mood on the New York day, with the zone", async ({ page }) => {
  await page.clock.setFixedTime(NY_EVENING);
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { features: { "home.journalPrompt": ON } },
    overrides: {
      "GET /v1/journal": () => ({ json: { today: "2026-10-20", entries: [] } }),
      "PUT /v1/journal/:date": (c) => ({
        json: { date: "2026-10-20", mood: 4, energy: null, career: null, relationship: null, money: null, note: null, events: [], snapshot: null, ...(c.body as object) },
      }),
    },
  });
  await signIn(page, "/");

  const card = page.getByTestId("journal-card");
  await card.getByRole("button", { name: "Mood: 4 of 5" }).click();
  await expect(card.getByText("Saved — thank you")).toBeVisible();

  expect(callsTo(api, "PUT /v1/journal/2026-10-21")).toHaveLength(0);
  const put = callsTo(api, "PUT /v1/journal/2026-10-20");
  expect(put).toHaveLength(1);
  expect(put[0]!.query.get("tz")).toBe("America/New_York");
  for (const c of callsTo(api, "GET /v1/journal")) expect(c.query.get("tz")).toBe("America/New_York");
});

test("practice and the calendar ask for the reader's day", async ({ page }) => {
  await page.clock.setFixedTime(NY_EVENING);
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { features: { "nav.dailyPractice": ON, "nav.calendar": ON } },
    overrides: {
      "GET /v1/practice/today": () => ({
        json: { date: "2026-10-20", items: [], done: [], streak: 0, week: [], monthDays: 0 },
      }),
      "GET /v1/calendar": () => ({ json: { from: "2026-10-20", to: "2027-02-16", events: [] } }),
    },
  });
  await signIn(page, "/practice");
  await expect.poll(() => callsTo(api, "GET /v1/practice/today").length).toBeGreaterThan(0);
  expect(callsTo(api, "GET /v1/practice/today")[0]!.query.get("tz")).toBe("America/New_York");

  await page.goto("/calendar");
  await expect.poll(() => callsTo(api, "GET /v1/calendar").length).toBeGreaterThan(0);
  const cal = callsTo(api, "GET /v1/calendar")[0]!;
  expect(cal.query.get("from")).toBe("2026-10-20");
  expect(cal.query.get("tz")).toBe("America/New_York");
});
