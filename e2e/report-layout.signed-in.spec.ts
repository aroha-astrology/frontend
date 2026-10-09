import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { MODEL_ONLY_TEXT, REPORT_FIXTURES, REPORT_KEYS } from "./fixtures/reports";

/**
 * Every report screen, on a small phone.
 *
 * Two things went wrong on real phones and must not come back on any report:
 *
 *  1. A card wider than the screen. Chrome on Android lays out every
 *     `position: fixed` element against the widest thing on the page, so one
 *     wide table pushed the bottom tab bar and the rating sheet off to the
 *     right — the report looked fine and the app chrome around it broke.
 *  2. Model-only data printed to the reader. The server attaches facts written
 *     for the model to every report's `scores`; a screen that prints whatever
 *     it finds showed them as a numbered list.
 */

const WIDTH = 360;
const REPORT_ID = "55555555-5555-4555-8555-555555555555";

test.use({ viewport: { width: WIDTH, height: 780 } });

async function openReport(page: Page, key: string) {
  await skipLaunchOverlays(page);
  await mockApi(page, { overrides: { "GET /v1/reports/:id": () => ({ json: REPORT_FIXTURES[key] }) } });
  await signIn(page, `/reports/${REPORT_ID}`);
  await expect(page.locator('[data-tour="report-header"]')).toBeVisible();
  await expect(page.getByText("A steady year that rewards patience").first()).toBeVisible();
  // The page slides in over 220ms; measure once it has landed.
  await page.waitForTimeout(350);
}

/** Opens every collapsed row, so what is behind a chevron is measured too. */
async function expandAll(page: Page) {
  for (let pass = 0; pass < 3; pass++) {
    const closed = page.locator('main button[aria-expanded="false"]');
    const n = await closed.count();
    if (n === 0) return;
    for (let i = n - 1; i >= 0; i--) await closed.nth(i).click();
    await page.waitForTimeout(250);
  }
}

/**
 * Everything in the report that sticks out past the screen edge.
 *
 * An element is fine if something clips or scrolls it sideways on the way up
 * its containing-block chain (a table inside an `overflow-x-auto` box). The
 * chain matters: an absolutely positioned element is NOT clipped by a scroll
 * box that sits between it and its positioned ancestor, which is how a hidden
 * screen-reader label inside a scrolling table can still widen the page.
 */
function overflowing(page: Page, width: number) {
  return page.evaluate((vw) => {
    const containingBlock = (el: Element): Element | null => {
      const pos = getComputedStyle(el).position;
      if (pos === "fixed") return null;
      let p = el.parentElement;
      if (pos !== "absolute") return p;
      while (p && p !== document.documentElement) {
        const s = getComputedStyle(p);
        if (s.position !== "static" || s.transform !== "none") return p;
        p = p.parentElement;
      }
      return null;
    };
    const clippedSideways = (el: Element): boolean => {
      // Every ancestor between the element and its containing block is skipped
      // for an absolute element; for anything else that is just the parent.
      for (let p = containingBlock(el); p && p !== document.documentElement; p = containingBlock(p)) {
        if (getComputedStyle(p).overflowX !== "visible" && p.tagName !== "MAIN") return true;
      }
      return false;
    };
    const out: string[] = [];
    for (const el of document.querySelectorAll("main *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= vw + 1 && r.left >= -1) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      if (clippedSideways(el)) continue;
      const cls = typeof el.className === "string" ? el.className.slice(0, 60) : "";
      out.push(`<${el.tagName.toLowerCase()} class="${cls}"> ${Math.round(r.left)}..${Math.round(r.right)}`);
    }
    return out.slice(0, 8);
  }, width);
}

for (const key of REPORT_KEYS) {
  test(`${key}: fits a ${WIDTH}px phone and prints no model-only data`, async ({ page }) => {
    await openReport(page, key);
    await expandAll(page);

    expect(await overflowing(page, WIDTH), "nothing sticks out past the screen edge").toEqual([]);

    // The bottom bar is laid out against the page's widest point, so its width
    // is the direct reading of whether the page stayed as wide as the screen.
    const bar = await page.getByTestId("bottom-nav").boundingBox();
    expect(Math.round(bar!.width), "bottom bar is as wide as the screen").toBe(WIDTH);
    expect(Math.round(bar!.x)).toBe(0);

    const text = await page.locator("main").innerText();
    for (const secret of MODEL_ONLY_TEXT) {
      expect(text, `"${secret}" is written for the model, not the reader`).not.toContain(secret);
    }
    // A plain layout prints unknown keys as headings: "Vakri Facts", "Planet Condition".
    expect(text).not.toMatch(/vakri facts|planet condition|birth time caveat|internal debug note|ashtakavarga summary/i);
  });
}

/** What each of the four screens that used to be the plain layout must now show. */
const NEW_SCREENS: Array<{ key: string; shows: string[]; hides: string[] }> = [
  {
    key: "remedies",
    shows: ["Your Karmic Debts (Rin)", "Planet by Planet", "Your Natural Strengths", "Needs Extra Attention", "Feed crows and stray dogs on Saturdays."],
    hides: ["This report covers"],
  },
  {
    key: "relationship_monthly",
    shows: ["This Month's Outlook", "Within the Month", "Favourable month"],
    hides: ["This report covers", "Relationship Status"],
  },
  {
    key: "match_report",
    shows: ["Guna Milan Score", "Life Areas", "Ashtakoota Breakdown"],
    hides: ["This report covers"],
  },
  {
    key: "name_change",
    shows: ["Your Core Numbers", "Name Numbers That Suit You", "Suggested Spelling Adjustments", "Best Match"],
    hides: ["This report covers", "Missing Inputs"],
  },
];

for (const screen of NEW_SCREENS) {
  test(`${screen.key}: has a designed screen, not the plain layout`, async ({ page }) => {
    await openReport(page, screen.key);
    const main = page.locator("main");
    for (const text of screen.shows) await expect(main.getByText(text, { exact: false }).first()).toBeVisible();
    for (const text of screen.hides) await expect(main.getByText(text, { exact: false })).toHaveCount(0);
    // The hero with the report's artwork, as on Marriage and the rest.
    await expect(page.locator('[data-tour="report-header"] img').first()).toBeVisible();
  });
}

test("match report translates its section headings from its own namespace", async ({ page }) => {
  await openReport(page, "match_report");
  // The ids are bare words ("wealth", "inlaws"); the fixture's own heading is "Section N".
  await expect(page.locator("main").getByText(/^Section \d+$/)).toHaveCount(0);
});

test("the KP year-ahead report says which year every date is in", async ({ page }) => {
  await openReport(page, "kp_annual");

  // September 2026 to August 2027: the table is split by year and says its range.
  const months = page.getByTestId("kp-months");
  await expect(months.getByText("Sep 2026 – Aug 2027")).toBeVisible();
  const years = months.locator('th[scope="rowgroup"]');
  await expect(years).toHaveText(["2026", "2027"]);
  // Four months of 2026 (Sep–Dec), then the 2027 row, then January.
  const rows = months.locator("tbody tr");
  await expect(rows.nth(0)).toHaveText("2026");
  await expect(rows.nth(1)).toContainText("Sep");
  await expect(rows.nth(5)).toHaveText("2027");
  await expect(rows.nth(6)).toContainText("Jan");

  const main = page.locator("main");
  // Best window, the end of the running bhukti, and the turning point: all with a year.
  await expect(main.getByText("Apr 26, 2027 – Sep 26, 2027").first()).toBeVisible();
  await expect(main.getByText("This bhukti runs until Apr 12, 2027.")).toBeVisible();
  await expect(main.getByText("Apr 12, 2027", { exact: true })).toBeVisible();
});

test("the rating sheet sits inside the screen on the widest report", async ({ page }) => {
  await openReport(page, "kp_annual");
  await page.getByRole("button", { name: "Rate this report" }).click();

  const sheet = page.getByRole("heading", { name: "Rate this report" }).locator("xpath=ancestor::div[contains(@class,'max-w-md')][1]");
  await expect(sheet).toBeVisible();
  // Let the sheet's spring settle.
  await page.waitForTimeout(600);
  const box = await sheet.boundingBox();
  expect(Math.round(box!.x), "sheet starts at the left edge").toBeGreaterThanOrEqual(0);
  expect(Math.round(box!.x + box!.width), "sheet ends at the right edge").toBeLessThanOrEqual(WIDTH);

  const stars = page.getByRole("button", { name: /out of 5/i });
  await expect(stars).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const star = await stars.nth(i).boundingBox();
    expect(star!.x).toBeGreaterThanOrEqual(0);
    expect(star!.x + star!.width).toBeLessThanOrEqual(WIDTH);
  }
});
