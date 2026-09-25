import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const REPORT_ID = "22222222-2222-4222-8222-222222222222";
const serverError = { status: 500, json: { error: { code: "INTERNAL", message: "e2e" } } };
const generating = { status: 202, json: { status: "generating" } };

const READY = {
  status: "ready",
  reportKey: "e2e_reading",
  periodMonth: null,
  scores: {},
  sections: [{ heading: "Your year ahead", paragraphs: ["Slow and steady wins this year."] }],
};

const PAST_LIFE = {
  key: "past_life",
  label: "Past Life Report",
  isMonthly: false,
  isYearly: false,
  requiresPartner: false,
  enabled: true,
  isNew: false,
  pricePaise: 19_900,
  originalPricePaise: null,
  purchases: [],
  lastSpouseDetails: null,
};

test.describe("Report edge cases", () => {
  test("a report that failed says the money went back to the wallet", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: {
        "GET /v1/reports/:id": () => ({
          json: { status: "failed", error: "Report generation failed. Any amount charged has been automatically refunded." },
        }),
      },
    });
    await signIn(page, `/reports/${REPORT_ID}`);

    await expect(
      page.getByText("We couldn't generate this report. Any amount you paid has been refunded to your wallet."),
    ).toBeVisible();
  });

  test("one failed status check while waiting doesn't show a failure", async ({ page }) => {
    await skipLaunchOverlays(page);
    let checks = 0;
    await mockApi(page, {
      overrides: {
        "GET /v1/reports/:id": () => {
          checks += 1;
          if (checks === 1) return generating;
          if (checks === 2) return serverError;
          return { json: READY };
        },
      },
    });
    await signIn(page, `/reports/${REPORT_ID}`);

    await expect(page.getByText("Slow and steady wins this year.")).toBeVisible({ timeout: 30_000 });
    expect(checks).toBeGreaterThanOrEqual(3);
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  });

  test("a report still being written after the wait says so and can be checked again", async ({ page }) => {
    await page.clock.install();
    await skipLaunchOverlays(page);
    let ready = false;
    await mockApi(page, {
      overrides: { "GET /v1/reports/:id": () => (ready ? { json: READY } : generating) },
    });
    await signIn(page, `/reports/${REPORT_ID}`);
    await expect(page.getByText("Writing your report…").first()).toBeVisible();

    // The page waits 6 minutes — past the "2-5 minutes" it promises — before it stops.
    for (let i = 0; i < 30; i++) {
      await page.clock.fastForward("00:15");
      if (await page.getByTestId("report-slow").count()) break;
    }
    const slow = page.getByTestId("report-slow");
    await expect(slow).toContainText("Taking longer than expected");
    await expect(page.getByText("We couldn't generate this report")).toHaveCount(0);

    ready = true;
    await slow.getByRole("button", { name: "Check Again" }).click();
    await expect(page.getByText("Slow and steady wins this year.")).toBeVisible();
  });

  test("the catalogue offers Try again when it can't load", async ({ page }) => {
    await skipLaunchOverlays(page);
    let failing = true;
    await mockApi(page, {
      overrides: { "GET /v1/reports": () => (failing ? serverError : { json: { reports: [PAST_LIFE] } }) },
    });
    await signIn(page, "/reports");

    await expect(page.getByText("Couldn't load reports. Please try again.")).toBeVisible();
    failing = false;
    await page.getByRole("button", { name: "Try Again" }).click();
    await expect(page.getByText("Past Life Report").first()).toBeVisible();
  });
});
