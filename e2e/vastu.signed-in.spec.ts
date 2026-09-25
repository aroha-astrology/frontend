import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const PLAN_ID = "66666666-6666-4666-8666-666666666666";

const plan = (over: Record<string, unknown>) => ({
  id: PLAN_ID,
  status: "done",
  overallScore: 72,
  analysis: null,
  createdAt: "2026-09-20T10:00:00.000Z",
  ...over,
});

const ANALYSIS = {
  summary: ["Your north-east is open and bright.", "Move the kitchen fire away from the north.", "Sleep with your head to the south."],
  priorityActions: ["Clear the north-east corner."],
};

function vastuMocks(over: Handlers = {}): Handlers {
  return {
    "GET /v1/vastu": () => ({ json: { plans: [] } }),
    "POST /v1/vastu/analyze": () => ({ json: { planId: PLAN_ID } }),
    "GET /v1/vastu/:id": () => ({ json: plan({ analysis: ANALYSIS }) }),
    ...over,
  };
}

async function generate(page: Page) {
  await page.getByRole("button", { name: /^Generate Report/ }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
}

test.describe("Vastu planner", () => {
  test("generating a report charges once and shows the remedies", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { overrides: vastuMocks() });
    await signIn(page, "/vastu");

    await expect(page.getByRole("heading", { name: "Live Vastu Analysis" })).toBeVisible();
    await generate(page);

    await expect(page.getByText("AI Remedies & Solutions")).toBeVisible();
    await expect(page.getByText("Your north-east is open and bright.")).toBeVisible();
    expect(callsTo(api, "POST /v1/vastu/analyze")).toHaveLength(1);
  });

  test("a failed report says the charge was refunded", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: vastuMocks({ "GET /v1/vastu/:id": () => ({ json: plan({ status: "error", overallScore: null }) }) }),
    });
    await signIn(page, "/vastu");

    await generate(page);
    await expect(
      page.getByText("Could not generate the report. Any amount charged has been refunded to your wallet."),
    ).toBeVisible();
  });

  test("a slow report says it's still being written instead of failing", async ({ page }) => {
    await page.clock.install();
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: vastuMocks({ "GET /v1/vastu/:id": () => ({ json: plan({ status: "processing", overallScore: null }) }) }),
    });
    await signIn(page, "/vastu");

    await generate(page);
    const note = page.getByTestId("vastu-still-working");
    for (let i = 0; i < 80 && !(await note.count()); i++) await page.clock.fastForward("00:03");
    await expect(note).toHaveText(
      "This is taking longer than usual. Your report will appear in the list below when it's ready.",
    );
    await expect(page.getByText("Could not generate the report")).toHaveCount(0);
  });

  test("history rows show a readable status for unfinished plans", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: vastuMocks({
        "GET /v1/vastu": () => ({
          json: {
            plans: [
              plan({ id: "a", status: "processing", overallScore: null }),
              plan({ id: "b", status: "error", overallScore: null }),
            ],
          },
        }),
      }),
    });
    await signIn(page, "/vastu");

    await expect(page.getByText("Working…")).toBeVisible();
    await expect(page.getByText("Failed · refunded")).toBeVisible();
    await expect(page.getByText("processing", { exact: true })).toHaveCount(0);
  });

  test("a short wallet points to recharge instead of generating", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { walletBalancePaise: 0 }, overrides: vastuMocks() });
    await signIn(page, "/vastu");

    await expect(page.getByRole("link", { name: "Recharge Wallet" })).toHaveAttribute("href", "/payment");
    await expect(page.getByRole("button", { name: /^Generate Report/ })).toHaveCount(0);
    expect(callsTo(api, "POST /v1/vastu/analyze")).toHaveLength(0);
  });
});
