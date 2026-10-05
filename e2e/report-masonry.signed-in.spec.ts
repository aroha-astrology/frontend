import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * A designed report on a wide screen is two columns of cards. Each card goes
 * under whichever column is shorter, so one column never ends far above the
 * other with a hole beside it.
 */

const REPORT_ID = "55555555-5555-4555-8555-555555555555";

const LONG =
  "Your Rahu in the first house and Ketu in the seventh describe a life that keeps asking who you are " +
  "when nobody else is in the room. Each chapter so far has pulled you back to that question, and each " +
  "answer has been a little steadier than the last.";

/** The shape that left the hole: short cards first, then the long narrative and the verdict. */
const PAST_LIFE_REPORT = {
  status: "ready",
  reportKey: "past_life",
  periodMonth: null,
  scores: {
    header: {
      name: "Asha",
      dob: "1992-07-21",
      lagnaSign: "Libra",
      moonSign: "Taurus",
      moonNakshatra: "Rohini",
      currentMahadasha: "Saturn",
      currentAntardasha: "Mercury",
      dashaEndsOn: "2026-12-31",
    },
    rahuHouse: 1,
    ketuHouse: 7,
    rahuSign: "Libra",
    ketuSign: "Aries",
    twelfthLordStrength: "strong",
    lifeSoFar: [
      { label: "Age 0–7", startDate: "1992-07-21", endDate: "1999-07-21", score: 62, tone: "favorable" },
      { label: "Age 7–27", startDate: "1999-07-21", endDate: "2019-07-21", score: 48, tone: "mixed" },
      { label: "Age 27–34", startDate: "2019-07-21", endDate: "2026-07-21", score: 70, tone: "favorable" },
    ],
    doshaYoga: {
      positives: [{ label: "Shasha Yoga", detail: "Saturn in own or exalted sign in a Kendra house." }],
      cautions: [{ label: "Pitra Dosha", detail: "mild severity" }],
    },
    verdict: {
      headline: "Your karmic path invites you to embrace self-growth while balancing deep partnerships.",
      bullets: Array.from({ length: 5 }, (_, i) => `Takeaway ${i + 1}. ${LONG}`),
      nextStep: "Take 10 minutes this week to journal about one personal boundary you want to honor.",
    },
  },
  // Ids with no translated heading, so each row is titled by the `heading` given here.
  // Only the first row starts open, and it is the long one.
  sections: Array.from({ length: 4 }, (_, i) => ({
    id: `e2e_section_${i}`,
    heading: `Chapter ${i + 1}`,
    hook: `Hook for chapter ${i + 1}.`,
    paragraphs: [`Chapter ${i + 1} body. ${LONG}`, LONG, LONG, LONG],
  })),
};

async function openReport(page: Page) {
  await skipLaunchOverlays(page);
  await mockApi(page, { overrides: { "GET /v1/reports/:id": () => ({ json: PAST_LIFE_REPORT }) } });
  await signIn(page, `/reports/${REPORT_ID}`);
  await expect(page.getByText("Chapter 1 body.")).toBeVisible();
  // The page slides in over 220ms; measure once it has landed.
  await page.waitForTimeout(350);
}

interface Card {
  left: number;
  top: number;
  bottom: number;
}

/** The cards of the report body that take up space, as page rectangles. */
const cards = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelector('[data-tour="report-body"]')!.children)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.height > 0)
      .map((r) => ({ left: Math.round(r.left), top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) })),
  );

function columns(list: Card[]): Card[][] {
  const lefts = [...new Set(list.map((c) => c.left))].sort((a, b) => a - b);
  return lefts.map((left) => list.filter((c) => c.left === left).sort((a, b) => a.top - b.top));
}

function expectNoOverlap(cols: Card[][]) {
  for (const col of cols) {
    for (let i = 1; i < col.length; i++) {
      expect(col[i]!.top, "a card starts below the one above it").toBeGreaterThanOrEqual(col[i - 1]!.bottom);
    }
  }
}

/** Every card starts no lower than the end of the shorter column, give or take the gap between cards. */
function expectNoHole(cols: Card[][]) {
  const shorterEnd = Math.min(...cols.map((col) => col[col.length - 1]!.bottom));
  const lowestStart = Math.max(...cols.flat().map((c) => c.top));
  expect(lowestStart, "no card starts below the end of the shorter column").toBeLessThanOrEqual(shorterEnd + 28);
}

test.describe("Report cards on a wide screen", () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test("fill two columns without leaving a hole in the shorter one", async ({ page }) => {
    await openReport(page);
    const cols = columns(await cards(page));
    expect(cols).toHaveLength(2);
    expectNoOverlap(cols);
    expectNoHole(cols);
  });

  test("move to fill the space when a closed chapter is opened", async ({ page }) => {
    await openReport(page);
    await expect(page.getByText("Chapter 3 body.")).toHaveCount(0);
    await page.getByRole("button", { name: /Chapter 3/ }).click();
    await expect(page.getByText("Chapter 3 body.")).toBeVisible();
    await page.getByRole("button", { name: /Chapter 4/ }).click();
    await expect(page.getByText("Chapter 4 body.")).toBeVisible();
    // The rows open over 240ms.
    await page.waitForTimeout(500);

    const cols = columns(await cards(page));
    expect(cols).toHaveLength(2);
    expectNoOverlap(cols);
    expectNoHole(cols);
  });
});

test.describe("Report cards on a phone", () => {
  test("stay in one column, in reading order", async ({ page }) => {
    await openReport(page);
    const cols = columns(await cards(page));
    expect(cols).toHaveLength(1);
    expectNoOverlap(cols);
  });
});
