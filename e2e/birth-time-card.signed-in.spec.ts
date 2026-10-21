import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * The Birth Time Confidence card's form. On a phone the date field used to be
 * squeezed to a sliver and the event picker ran past the card's edge; an empty
 * date field was a blank box that never said what it was for.
 */

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const STATUS = {
  time: "06:40:00",
  accuracy: "exact",
  source: null,
  confidence: { pct: 72, level: "medium", basis: "stated_exact" },
  latest: null,
};
const CHECK = {
  id: "c1",
  statedTime: "06:40",
  suggestedTime: "06:52",
  offsetMinutes: 12,
  confidence: "medium",
  confidencePct: 68,
  eventMatches: [
    { date: "2019-07-01", domain: "job_started", strength: "strong" },
    { date: "2021-11-28", domain: "marriage", strength: "weak" },
    { date: "2023-03-14", domain: "childbirth", strength: "none" },
  ],
  counts: { strong: 1, weak: 1, none: 1 },
  canApply: true,
  appliedAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  pricePaidPaise: 0,
};

test("on a 360px phone every field of an event is usable and stays inside the card", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: { "home.birthTimeConfidence": ON } },
    overrides: { "GET /v1/birth-time": () => ({ json: STATUS }) },
  });
  await signIn(page, "/settings");

  const card = page.getByTestId("birth-time-card");
  await card.getByRole("button", { name: "Improve birth-time accuracy" }).click();
  await card.getByRole("button", { name: "Add another event" }).click();

  const box = (await card.boundingBox())!;
  for (const row of await card.getByTestId("life-event-row").all()) {
    for (const field of [row.locator("select"), row.locator('input[type="date"]')]) {
      const f = (await field.boundingBox())!;
      // Wide enough to read a date or an event name (the date used to get about 30px), and not past the card's edges.
      expect(f.width).toBeGreaterThanOrEqual(180);
      expect(f.x).toBeGreaterThanOrEqual(box.x);
      expect(f.x + f.width).toBeLessThanOrEqual(box.x + box.width);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("an empty date says what it is for, a chosen one reads as a date, and three dated events run the check", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { features: { "home.birthTimeConfidence": ON } },
    overrides: {
      "GET /v1/birth-time": () => ({ json: STATUS }),
      "POST /v1/birth-time/check": () => ({ json: CHECK }),
    },
  });
  await signIn(page, "/settings");

  const card = page.getByTestId("birth-time-card");
  await expect(card.getByText("Your birth time: 06:40")).toBeVisible();
  await expect(card.getByText("72%")).toBeVisible();
  await card.getByRole("button", { name: "Improve birth-time accuracy" }).click();

  const rows = card.getByTestId("life-event-row");
  const run = card.getByRole("button", { name: "Check my birth time" });
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByText("Pick the date")).toBeVisible();
  // A single row has nothing to remove.
  await expect(card.getByRole("button", { name: "Remove this event" })).toHaveCount(0);
  await expect(run).toBeDisabled();

  await rows.nth(0).getByLabel("Pick the date").fill("2019-07-01");
  await expect(rows.nth(0).getByText("Jul 1, 2019")).toBeVisible();
  await expect(rows.nth(0).getByText("Pick the date")).toHaveCount(0);

  await card.getByRole("button", { name: "Add another event" }).click();
  await rows.nth(1).locator("select").selectOption("marriage");
  await rows.nth(1).getByLabel("Pick the date").fill("2021-11-28");
  await card.getByRole("button", { name: "Add another event" }).click();
  await card.getByRole("button", { name: "Add another event" }).click();
  await expect(rows).toHaveCount(4);
  // The empty third row goes; the fourth takes its place.
  await card.getByRole("button", { name: "Remove this event" }).nth(2).click();
  await expect(rows).toHaveCount(3);
  await expect(run).toBeDisabled();
  await rows.nth(2).locator("select").selectOption("childbirth");
  await rows.nth(2).getByLabel("Pick the date").fill("2023-03-14");

  await run.click();
  await expect.poll(() => callsTo(api, "POST /v1/birth-time/check").length).toBe(1);
  expect(callsTo(api, "POST /v1/birth-time/check")[0]!.body).toEqual({
    events: [
      { date: "2019-07-01", domain: "job_started" },
      { date: "2021-11-28", domain: "marriage" },
      { date: "2023-03-14", domain: "childbirth" },
    ],
  });

  const result = card.getByTestId("birth-time-result");
  await expect(result.getByText("Suggested time: 06:52")).toBeVisible();
  // Dates read as dates, not as 2021-11-28.
  await expect(result.getByText("Nov 28, 2021")).toBeVisible();
  await expect(result.getByText("2021-11-28")).toHaveCount(0);
  await expect(result.getByText("Strong match")).toBeVisible();
  await expect(result.getByRole("button", { name: "Use 06:52 as my birth time" })).toBeVisible();
});
