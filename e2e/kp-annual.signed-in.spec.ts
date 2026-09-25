import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type ApiCall } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
// A real KP Year Ahead report: `scores` were computed by the backend's own KP engine
// (KP ayanamsa, Placidus cusps, a year of dashas and transits) for a sample chart.
import KP_REPORT from "./fixtures/kp-annual-report.json";

const KP_ENTRY = {
  key: "kp_annual",
  label: "KP Year Ahead Report",
  isMonthly: false,
  isYearly: true,
  requiresPartner: false,
  enabled: true,
  isNew: true,
  pricePaise: 10_100,
  originalPricePaise: 25_100,
  purchases: [],
  lastSpouseDetails: null,
};
const REPORT_ID = "33333333-3333-4333-8333-333333333333";

/** Mirrors the backend's policy for the two topics that matter here, so the pre-check reacts
 * to what is typed rather than to a canned answer. */
function checkQuestions(call: ApiCall) {
  const { questions } = call.body as { questions: string[] };
  const results = questions.map((q, index) => {
    if (/kill myself|end my life|suicide/i.test(q)) {
      return { index, allowed: false, topic: "suicide", message: "Please reach out right now — iCall: 9152987821" };
    }
    if (/\b(die|death|lifespan|how long will i live)\b/i.test(q)) {
      return { index, allowed: false, topic: "death", message: "sorry" };
    }
    return { index, allowed: true, topic: null, message: "" };
  });
  return { json: { allowed: results.every((r) => r.allowed), results } };
}

async function openKpDrawer(page: import("@playwright/test").Page) {
  const card = page
    .locator("div")
    .filter({ hasText: "KP Year Ahead Report" })
    .filter({ has: page.getByRole("button", { name: "Buy", exact: true }) })
    .last();
  await expect(card).toContainText("₹101");
  await expect(card).toContainText("₹251");
  await card.getByRole("button", { name: "Buy", exact: true }).click();
  await expect(page.getByText("Ask your own questions (optional)")).toBeVisible();
}

test("a death question is refused before checkout; allowed questions go with the purchase", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: {
      "GET /v1/reports": () => ({ json: { reports: [KP_ENTRY] } }),
      "POST /v1/reports/questions/check": checkQuestions,
      "POST /v1/reports/purchase": () => ({
        json: { reports: [{ id: REPORT_ID, reportKey: "kp_annual", periodMonth: "2026-09-25", status: "generating" }] },
      }),
      "GET /v1/reports/:id": () => ({ json: { status: "generating" } }),
    },
  });
  await signIn(page, "/reports");
  await openKpDrawer(page);

  await page.getByLabel("Question 1").fill("Will I get a better job this year?");
  await page.getByLabel("Question 2").fill("When will my father die?");
  await page.getByRole("button", { name: /^Buy · ₹101/ }).click();

  await expect(page.getByText(/We don’t answer questions about death or lifespan/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Yes, Unlock" })).toHaveCount(0);
  expect(callsTo(api, "POST /v1/reports/purchase")).toHaveLength(0);

  await page.getByLabel("Question 2").fill("When is a good time for marriage?");
  await page.getByRole("button", { name: /^Buy · ₹101/ }).click();
  await page.getByRole("button", { name: "Yes, Unlock" }).click();

  await expect.poll(() => callsTo(api, "POST /v1/reports/purchase").length).toBe(1);
  expect(callsTo(api, "POST /v1/reports/purchase")[0]!.body).toEqual({
    reportKey: "kp_annual",
    answers: {
      question1: "Will I get a better job this year?",
      question2: "When is a good time for marriage?",
    },
  });
  await page.waitForURL(`**/reports/${REPORT_ID}`);
});

test("a self-harm question shows a helpline, not an error", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: {
      "GET /v1/reports": () => ({ json: { reports: [KP_ENTRY] } }),
      "POST /v1/reports/questions/check": checkQuestions,
    },
  });
  await signIn(page, "/reports");
  await openKpDrawer(page);

  await page.getByLabel("Question 1").fill("I want to end my life");
  await page.getByRole("button", { name: /^Buy · ₹101/ }).click();

  await expect(page.getByText(/iCall: 9152987821/)).toBeVisible();
  expect(callsTo(api, "POST /v1/reports/purchase")).toHaveLength(0);
});

test("the report reads the year month by month, answers the questions, and shows no score", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    overrides: {
      "GET /v1/reports": () => ({ json: { reports: [KP_ENTRY] } }),
      "GET /v1/reports/:id": () => ({ json: KP_REPORT }),
    },
  });
  await signIn(page, `/reports/${REPORT_ID}`);

  await expect(page.getByRole("heading", { name: "KP Year Ahead Report" })).toBeVisible();
  await expect(page.getByText("Your next 12 months, read the Krishnamurti Paddhati way")).toBeVisible();
  await expect(page.getByText(/Valid till/)).toBeVisible();

  // Opening card and the reader's own questions, answered.
  await expect(page.getByText("A patient first half, then a confident push").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Questions, Answered" })).toBeVisible();
  await expect(page.getByText("“Will I get a better job this year?”")).toBeVisible();
  await expect(page.getByText(/Update your CV in February/)).toBeVisible();

  // Every life area, judged in words.
  await expect(page.getByRole("heading", { name: "What Your Year Promises" })).toBeVisible();
  for (const area of ["Career & work", "Money & gains", "Love & marriage", "Studies & exams"]) {
    await expect(page.getByText(area, { exact: true }).first()).toBeVisible();
  }

  // Heatmap drives the month carousel.
  await expect(page.getByRole("heading", { name: "Your Year, Month By Month" })).toBeVisible();
  await expect(page.getByText("Your Monthly Guide")).toBeVisible();
  await expect(page.getByText("Start the conversations that matter.")).toBeVisible();

  await expect(page.getByRole("heading", { name: "The Planetary Period You Are In" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Big Transits This Year" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Ruling Planets" })).toBeVisible();

  // The KP chart is there as evidence, collapsed until asked for.
  await page.getByRole("button", { name: "Your KP Chart (12 Cusps)" }).click();
  await expect(page.getByRole("columnheader", { name: "Sub lord" })).toBeVisible();

  // No score anywhere.
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/\bscore\b/i);
  expect(body).not.toMatch(/\d+\s*\/\s*(10|100)\b/);
  expect(body).not.toMatch(/\d+\s*%/);
});
