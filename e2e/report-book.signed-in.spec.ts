import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { REPORT_FIXTURES, REPORT_KEYS } from "./fixtures/reports";

// Report book (2026-10-24): a finished report opens as a page-turning book, behind the
// nav.reportBook switch, with the reader's name on the cover, chapter art, graphs and one theme.

const REPORT_ID = "66666666-6666-4666-8666-666666666666";
const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

async function openReport(page: Page, bookOn = true, handwriting = false) {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: {
      features: {
        ...(bookOn ? { "nav.reportBook": ON } : {}),
        ...(handwriting ? { "nav.reportBookHandwriting": ON } : {}),
      },
    },
    overrides: { "GET /v1/reports/:id": () => ({ json: REPORT_FIXTURES.marriage }) },
  });
  await signIn(page, `/reports/${REPORT_ID}`);
  await expect(page.locator('[data-tour="report-header"]')).toBeVisible();
  await page.waitForTimeout(350);
}

/** Turns forward and waits for the page to land. */
async function turn(page: Page) {
  await page.getByTestId("book-next").click();
  await page.waitForTimeout(900);
}

test.describe("Report book (phone, one page at a time)", () => {
  test.use({ viewport: { width: 360, height: 760 } });

  test("the button is hidden while the switch is off", async ({ page }) => {
    await openReport(page, false);
    await expect(page.getByTestId("report-book-open")).toHaveCount(0);
  });

  test("opens on a cover with the reader's name, then contents, graphs and chapters in one theme", async ({ page }, info) => {
    await openReport(page);
    await page.getByTestId("report-book-open").click();
    const book = page.getByTestId("report-book");
    await expect(book).toBeVisible();

    // Cover: art, brand mark and the name laid over it (the same cover for everyone, name aside).
    await expect(page.getByTestId("book-cover")).toBeVisible();
    await expect(page.getByTestId("book-cover-name")).toHaveText("Asha");
    await expect(page.locator('img[src="/report-book/cover-art.svg"]').first()).toBeVisible();
    await expect(page.locator('img[alt="Aroha Astrology"]').first()).toBeVisible();
    await page.screenshot({ path: info.outputPath("book-cover.png") });

    // Cover opens onto the contents, which list every chapter.
    await turn(page);
    await expect(page.getByTestId("book-page-contents")).toBeVisible();
    // The report's own picture (the one its screen already uses) heads the contents.
    await expect(page.getByTestId("book-report-picture")).toHaveAttribute("src", "/reports/marriage.png");
    await expect
      .poll(() => page.getByTestId("book-report-picture").evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath("book-contents.png") });

    // The report's own data becomes graphs before the first chapter.
    await turn(page);
    await expect(page.getByTestId("book-page-chart")).toBeVisible();
    await page.screenshot({ path: info.outputPath("book-chart.png") });
    for (let i = 0; i < 4; i++) {
      await turn(page);
      if (await page.getByTestId("book-page-chapter").isVisible()) break;
    }
    await expect(page.getByTestId("book-page-chapter")).toBeVisible();
    await expect(page.locator('img[src^="/report-book/chapter-"]').first()).toBeVisible();
    await page.screenshot({ path: info.outputPath("book-chapter.png") });

    // No page needs a scrollbar: nothing inside a page is taller than the page.
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="book-page-"]')].filter((el) => el.scrollHeight > el.clientHeight + 2).length,
    );
    expect(overflow).toBe(0);

    // The page itself never grew wider than the phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

    // Closing returns to the report.
    await page.getByRole("button", { name: "Close" }).click();
    await expect(book).toHaveCount(0);
  });

  test("turning through every page: no raw id on any page, nothing overflows, nothing is cut off", async ({ page }) => {
    await openReport(page);
    await page.getByTestId("report-book-open").click();
    await expect(page.getByTestId("book-cover")).toBeVisible();
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      await turn(page);
      const state = await page.evaluate(() => {
        const pages = [...document.querySelectorAll('[data-testid^="book-page-"]')] as HTMLElement[];
        return pages.map((el) => ({
          text: el.innerText,
          over: el.scrollHeight > el.clientHeight + 2,
          // Anything inside the page below its bottom edge was clipped.
          clipped: [...el.querySelectorAll("p, li")].some((c) => c.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom + 1),
        }));
      });
      for (const p of state) {
        seen.add(p.text);
        expect(p.text, "a raw section id reached a page").not.toMatch(/\b[a-z]+_[a-z_]+\b/);
        expect(p.over, `page overflows: ${p.text.slice(0, 60)}`).toBe(false);
        expect(p.clipped, `page text is cut off: ${p.text.slice(0, 60)}`).toBe(false);
      }
    }
    // It really did go through the book: contents, graphs and several chapter pages.
    expect(seen.size).toBeGreaterThan(8);
  });

  test("the name is set in handwriting only when its own switch is on", async ({ page }) => {
    await openReport(page, true, false);
    await page.getByTestId("report-book-open").click();
    const plain = await page.getByTestId("book-cover-name").evaluate((el) => getComputedStyle(el).fontStyle);
    expect(plain).toBe("italic");
    expect(await page.getByTestId("book-cover-name").evaluate((el) => getComputedStyle(el).fontFamily)).not.toContain("Kalam");
  });

  test("with the handwriting switch on the name is set in the hand font", async ({ page }) => {
    await openReport(page, true, true);
    await page.getByTestId("report-book-open").click();
    expect(await page.getByTestId("book-cover-name").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/hand|Kalam/i);
  });

  test("every artwork file the book uses is served as an SVG", async ({ page, request, baseURL }) => {
    await openReport(page);
    for (const name of ["cover-art", "back-art", "divider", "chapter-love", "chapter-career", "chapter-money", "chapter-health", "chapter-spirit", "chapter-family", "chapter-timing", "chapter-general"]) {
      const res = await request.get(`${baseURL}/report-book/${name}.svg`);
      expect(res.status(), name).toBe(200);
      expect(res.headers()["content-type"], name).toContain("image/svg+xml");
    }
  });
});

// Compatibility with every report that exists today: the book only reads the report's own
// sections and scores, so each of the 16 types must open, page through to the end, and show no
// raw id, no overflow and no cut-off text.
test.describe("Report book works with every existing report type", () => {
  test.use({ viewport: { width: 360, height: 760 } });
  test.setTimeout(120_000);

  for (const key of REPORT_KEYS) {
    test(`${key}: opens and pages cleanly`, async ({ page }) => {
      await skipLaunchOverlays(page);
      await mockApi(page, {
        user: { features: { "nav.reportBook": ON } },
        overrides: { "GET /v1/reports/:id": () => ({ json: REPORT_FIXTURES[key] }) },
      });
      await signIn(page, `/reports/${REPORT_ID}`);
      await expect(page.locator('[data-tour="report-header"]')).toBeVisible();
      await page.waitForTimeout(350);
      // The report page itself is untouched: its own sections still render under the button row.
      await expect(page.locator('[data-tour="report-body"], [data-tour="report-sections"]').first()).toBeVisible();
      await page.getByTestId("report-book-open").click();
      await expect(page.getByTestId("book-cover")).toBeVisible();
      let chapterPages = 0;
      for (let i = 0; i < 40; i++) {
        await page.getByTestId("book-next").click();
        await page.waitForTimeout(450);
        const state = await page.evaluate(() =>
          ([...document.querySelectorAll('[data-testid^="book-page-"]')] as HTMLElement[]).map((el) => ({
            id: el.getAttribute("data-testid"),
            text: el.innerText,
            over: el.scrollHeight > el.clientHeight + 2,
            clipped: [...el.querySelectorAll("p, li")].some((c) => c.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom + 1),
          })),
        );
        for (const p of state) {
          if (p.id === "book-page-chapter") chapterPages++;
          expect(p.text, `${key}: a raw section id reached a page`).not.toMatch(/\b[a-z]+_[a-z_]+\b/);
          expect(p.over, `${key}: page overflows: ${p.text.slice(0, 50)}`).toBe(false);
          expect(p.clipped, `${key}: text cut off: ${p.text.slice(0, 50)}`).toBe(false);
        }
        if (state.some((p) => p.id === "book-page-closing")) break;
      }
      expect(chapterPages, `${key}: no chapter pages`).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    });
  }
});

test.describe("Report book (desktop, two-page spread)", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test("shows two pages side by side once the cover is opened", async ({ page }, info) => {
    await openReport(page);
    await page.getByTestId("report-book-open").click();
    await expect(page.getByTestId("book-cover")).toBeVisible();
    await turn(page);
    await page.waitForTimeout(300);
    await page.screenshot({ path: info.outputPath("book-spread.png") });
    await turn(page);
    await expect(page.locator('[data-testid^="book-page-"]').first()).toBeVisible();
    await page.screenshot({ path: info.outputPath("book-spread-2.png") });
  });
});
