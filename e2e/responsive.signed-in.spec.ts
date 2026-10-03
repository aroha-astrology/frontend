import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Layout contract for every customer route at phone, tablet and desktop sizes:
 * nothing scrolls sideways, the top bar lines up with the page content, the
 * page fills the width it is given (up to the 1200px cap), and navigation is
 * the bottom bar at every size.
 */

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

/** The ship-dark roadmap pages fail closed, so their flags are switched on here. */
const FEATURES = {
  "nav.calendar": ON,
  "nav.lifeTimeline": ON,
  "nav.decisions": ON,
  "panchang.findMyDate": ON,
  "nav.bonds": ON,
  "nav.journal": ON,
  "nav.dailyPractice": ON,
  "nav.arohaPass": ON,
  "nav.digitalYantra": ON,
  "nav.relocation": ON,
  "home.astroWeather": ON,
};

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "tablet landscape", width: 1024, height: 768 },
  { name: "laptop", width: 1440, height: 900 },
  { name: "desktop", width: 1920, height: 1080 },
];

/**
 * Routes whose content sits in the shared `.page-container` inside <main>.
 * Left out: /kundli (shows a spinner until a kundli is mocked) and
 * /profile/orders and /reports/history (own header + body layout, no <main>).
 */
const ROUTES = [
  "/",
  "/horoscope",
  "/reports",
  "/panchang",
  "/vastu",
  "/palm",
  "/shlokas",
  "/remedies",
  "/compatibility",
  "/gemstones",
  "/profile",
  "/settings",
  "/settings/history",
  "/payment",
  "/help",
  "/rewards",
  "/chat-history",
  "/calendar",
  "/timeline",
  "/decide",
  "/find-date",
  "/bonds",
  "/journal",
  "/practice",
  "/pass",
  "/yantra",
  "/relocation",
  "/weather",
];

/** From here the Vastu plan sits beside its analysis instead of above it. */
const WIDE_FROM = 1024;
const PAGE_MAX = 1200;

const square = [
  { x: 0, y: 0 },
  { x: 12, y: 0 },
  { x: 12, y: 12 },
  { x: 0, y: 12 },
];

const VASTU_HOME = {
  id: "77777777-7777-4777-8777-777777777777",
  name: "My Home",
  layout: {
    plot: square,
    northOffsetDeg: 0,
    rooms: [{ id: "k1", type: "kitchen", x: 9, y: 9, w: 3, h: 3, fixtures: [] }],
  },
  overallScore: 100,
  ruleSetId: "aroha-traditional-v1",
  archived: false,
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
};

async function open(page: Page) {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: FEATURES },
    overrides: {
      "GET /v1/vastu/homes": () => ({ json: { homes: [VASTU_HOME] } }),
      "GET /v1/vastu": () => ({ json: { plans: [] } }),
    },
  });
  await signIn(page, "/");
}

const box = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), bottom: Math.round(r.bottom) };
  }, selector);

for (const vp of VIEWPORTS) {
  test.describe(`Responsive layout — ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, isMobile: false, hasTouch: false });

    const wide = vp.width >= WIDE_FROM;

    test("every route fills its width, aligns with the top bar, and never scrolls sideways", async ({ page }) => {
      test.setTimeout(300_000);
      await open(page);

      for (const route of ROUTES) {
        await page.goto(route);
        const container = page.locator("main .page-container").first();
        const found = await container
          .waitFor({ state: "visible", timeout: 8_000 })
          .then(() => true)
          .catch(() => false);
        expect.soft(found, `${route}: content sits in the shared page container`).toBe(true);
        if (!found) continue;
        // The page slides in over 220ms; measure once it has landed.
        await page.waitForTimeout(350);
        expect.soft(new URL(page.url()).pathname, `${route}: stayed on the route`).toBe(route);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect.soft(overflow, `${route}: no sideways scroll`).toBeLessThanOrEqual(0);

        const content = await box(page, "main .page-container");
        const bar = await box(page, '[data-testid="topbar-row"]');
        expect.soft(bar, `${route}: top bar row exists`).not.toBeNull();
        if (content && bar) {
          expect.soft(Math.abs(content.left - bar.left), `${route}: left edge matches the top bar`).toBeLessThanOrEqual(1);
          expect.soft(Math.abs(content.right - bar.right), `${route}: right edge matches the top bar`).toBeLessThanOrEqual(1);
          expect
            .soft(Math.abs(content.width - Math.min(PAGE_MAX, vp.width)), `${route}: fills the available width (got ${content.width}px)`)
            .toBeLessThanOrEqual(1);
        }
      }
    });

    test("navigation is the bottom bar", async ({ page }) => {
      await open(page);
      const bottom = page.getByTestId("bottom-nav");
      await expect(bottom).toBeVisible();
      await expect(page.getByTestId("side-nav")).toHaveCount(0);
      const bar = await box(page, '[data-testid="bottom-nav"]');
      expect(bar!.width).toBe(vp.width);
      expect(bar!.bottom).toBe(vp.height);
      await bottom.getByRole("link", { name: "Horoscope" }).click();
      await expect(page).toHaveURL(/\/horoscope$/);
    });

    test("the Vastu canvas fits on screen", async ({ page }) => {
      await open(page);
      await page.goto("/vastu");
      const canvas = page.locator('[data-tour="vastu-canvas"]');
      await expect(canvas).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      if (wide) {
        // Side-by-side with the analysis: the whole square is visible without
        // scrolling, above the bottom bar.
        const rect = await box(page, '[data-tour="vastu-canvas"]');
        const barTop = await page.getByTestId("bottom-nav").evaluate((el) => Math.round(el.getBoundingClientRect().top));
        expect(rect!.bottom).toBeLessThanOrEqual(barTop);
      }
    });

    test("chat keeps its input on screen", async ({ page }) => {
      await open(page);
      await page.goto("/ai-chat");
      const input = page.locator("textarea").first();
      await expect(input).toBeVisible();
      const rect = await input.boundingBox();
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(vp.height);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
