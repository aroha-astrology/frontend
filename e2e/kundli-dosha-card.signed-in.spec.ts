import { test, expect, type Page } from "@playwright/test";
import { mockApi, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Audit 2026-10-28, Sprint 1, on a 360px phone:
 * - H2: a cancelled Mangal Dosha showed as a MEDIUM dosha and was counted in "doshas found";
 *   the reason it is cancelled never appeared.
 * - M13: a Sade Sati or Dhaiya on a retrograde break, or the next one, showed nothing.
 */

test.use({ viewport: { width: 360, height: 780 } });

function kundli(doshas: Record<string, unknown>, yogas: unknown[] = []): Handlers {
  return {
    "GET /v1/kundli": () => ({
      json: { status: "ready", chart: { planets: [], houses: [] }, dasha: null, yogas: { yogas }, doshas },
    }),
  };
}

async function open(page: Page, overrides: Handlers) {
  await skipLaunchOverlays(page);
  await mockApi(page, { overrides });
  await signIn(page, "/kundli");
}

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("a cancelled Mangal Dosha reads Cancelled, with its reason, and is not counted", async ({ page }) => {
  await open(
    page,
    kundli({
      mangal: {
        present: true,
        severity: "none",
        type: "cancelled",
        cancellations: ["Mars in own sign Aries - cancellation applies"],
        description:
          "Mars sits in house 4 from your Lagna, which would normally form Mangal Dosha, but Mars in own sign Aries — a traditional cancellation that substantially neutralizes its effect.",
      },
      sadeSati: { active: true, phase: "peak", severity: "severe", description: "Saturn is over your Moon sign." },
    }),
  );

  await expect(page.getByText("1 Dosha found")).toBeVisible();
  const mangal = page.locator("div.rounded-xl", { hasText: "Mangal Dosha" }).last();
  // Plain mode (the default): the badge, and the reason inside the description.
  await expect(mangal.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(mangal).toContainText("own sign Aries");
  await noSideScroll(page);

  // Technical mode adds the reason line, and still no severity badge.
  await page.getByRole("button", { name: "Technical", exact: true }).click();
  await expect(mangal.getByText("Cancellation: Mars in own sign Aries")).toBeVisible();
  await expect(mangal.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(mangal.getByText("medium", { exact: true })).toHaveCount(0);
  await noSideScroll(page);
});

test("the next Sade Sati and Dhaiya show their start dates when nothing is running", async ({ page }) => {
  await open(
    page,
    kundli({
      mangal: { present: false, severity: "none", type: "none", cancellations: [] },
      sadeSati: {
        active: false,
        phase: "none",
        resumesOn: null,
        next: { startDate: "2027-06-03T00:47:00.000Z", endDate: "2034-08-08T00:00:00.000Z" },
      },
      dhaiya: {
        active: false,
        phase: "none",
        resumesOn: null,
        next: { phase: "4th", startDate: "2029-08-08T00:00:00.000Z", endDate: "2032-05-31T00:00:00.000Z" },
      },
    }),
  );

  await expect(page.getByText("Next: Sade Sati from 3 Jun 2027")).toBeVisible();
  await expect(page.getByText("Next: Shani Dhaiya from 8 Aug 2029")).toBeVisible();
  await expect(page.getByText(/Doshas? found/)).toHaveCount(0);
  await noSideScroll(page);
});

test("a Dhaiya on a retrograde break says when it resumes", async ({ page }) => {
  await open(
    page,
    kundli({
      dhaiya: {
        active: false,
        phase: "none",
        resumesOn: "2027-10-20T00:47:00.000Z",
        next: null,
      },
    }),
  );

  await expect(page.getByText("Shani Dhaiya: on a break until 20 Oct 2027")).toBeVisible();
  await noSideScroll(page);
});
