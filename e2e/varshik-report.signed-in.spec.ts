import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { sampleReport } from "../components/reports/varshik/fixtures/sample-report";

/**
 * Varshik Rashifal 2027, the designed screen, on a small phone: the pages turn, the contents list and
 * the Timing Map open the right page, the decision pills filter, and nothing is wider than the screen.
 * The numbers are the Sprint 3 test report's facts; the words are placeholder sentences.
 */

const WIDTH = 360;
const REPORT_ID = "66666666-6666-4666-8666-666666666666";
test.use({ viewport: { width: WIDTH, height: 780 } });

const TOTAL = 61; // 57 core pages (54 + the three C3 star pages) + 2 questions + the relief page + the closing letter

async function openVarshik(page: Page) {
  await skipLaunchOverlays(page);
  await mockApi(page, { overrides: { "GET /v1/reports/:id": () => ({ json: sampleReport }) } });
  await signIn(page, `/reports/${REPORT_ID}`);
  await expect(page.getByTestId("varshik-report")).toBeVisible();
  await page.waitForTimeout(400);
}

const pageEls = (page: Page) => page.getByTestId("varshik-report").locator('[id^="vk-page-"]');

test("the report is one long scroll of 61 pages, with no Next or Previous buttons", async ({ page }) => {
  await openVarshik(page);
  const report = page.getByTestId("varshik-report");
  await expect(pageEls(page)).toHaveCount(TOTAL);
  await expect(report.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
  await expect(report.getByRole("button", { name: "Previous" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download PDF" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Read as a book" })).toHaveCount(0);
});

test("the contents list jumps to a chapter's page, and the Timing Map tile opens that month", async ({ page }) => {
  await openVarshik(page);
  const report = page.getByTestId("varshik-report");
  await report.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("button", { name: /Your Master Timing Map/ }).click();
  await expect(report.getByRole("heading", { name: "Your Master Timing Map" })).toBeVisible();
  await page.waitForTimeout(500);

  // Tapping the February tile of the Love row opens February's first page.
  await report.getByRole("button", { name: /^Love, Feb: / }).click();
  await expect(report.getByRole("heading", { name: "February 2027" }).first()).toBeVisible();
  await expect(report.getByText("The month at a glance").first()).toBeVisible();
});

test("first-time guide on the decision pills shows once, then stays gone", async ({ page }) => {
  await openVarshik(page);
  const report = page.getByTestId("varshik-report");
  await report.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("button", { name: /^When to act/ }).click();
  await expect(report.getByTestId("decision-ftue")).toBeVisible();
  await report.getByRole("button", { name: "Got it" }).click();
  await expect(report.getByTestId("decision-ftue")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("varshik-report")).toBeVisible();
  await expect(page.getByTestId("decision-ftue")).toHaveCount(0);
});

test("the decision pills show one decision at a time", async ({ page }) => {
  await openVarshik(page);
  const report = page.getByTestId("varshik-report");
  await report.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("button", { name: /^When to act/ }).click();
  const pills = report.getByRole("group", { name: "Show one decision" });
  await expect(pills).toBeVisible();
  await pills.getByRole("button", { name: "All" }).click();
  const all = await report.locator("li:has(> div .vk-h3), ul > li").count();
  await pills.getByRole("button", { name: "Marriage" }).click();
  await expect(pills.getByRole("button", { name: "Marriage" })).toHaveAttribute("aria-pressed", "true");
  // One decision card (plus the legend items) instead of ten.
  expect(await report.locator("li").count()).toBeLessThan(all);
});

test("every page fits the screen: nothing is wider than the phone", async ({ page }) => {
  await openVarshik(page);
  const els = pageEls(page);
  for (let i = 0; i < TOTAL; i++) {
    await els.nth(i).scrollIntoViewIfNeeded();
    const widths = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(widths.sw, `page ${i + 1} is wider than the screen`).toBeLessThanOrEqual(widths.cw);
  }
});

test("the three star pages (C3) open from the contents and draw their charts", async ({ page }) => {
  await openVarshik(page);
  const report = page.getByTestId("varshik-report");

  await report.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("button", { name: /^Your birth stars/ }).click();
  await expect(report.getByRole("heading", { name: "Your birth stars" })).toBeVisible();
  await expect(report.getByText("Your birth star", { exact: true })).toBeVisible();
  // ten rows: nine planets and the Lagna
  await expect(report.getByText(/^Star lord /)).toHaveCount(10);

  await report.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("button", { name: /^The year's three flags/ }).click();
  await expect(report.getByRole("heading", { name: "The year's three flags" })).toBeVisible();
  await expect(report.getByText("The Lagna flag").first()).toBeVisible();
  await expect(report.getByText("Patyayini periods, by the week").first()).toBeVisible();

  await report.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("button", { name: /^Your stars in 2027/ }).click();
  await expect(report.getByRole("heading", { name: "Your stars in 2027" })).toBeVisible();
  await expect(report.getByRole("img", { name: "The 27 stars counted from your birth star" })).toBeVisible();
});
