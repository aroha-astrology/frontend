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

const HOME_ID = "77777777-7777-4777-8777-777777777777";

const square = [
  { x: 0, y: 0 },
  { x: 12, y: 0 },
  { x: 12, y: 12 },
  { x: 0, y: 12 },
];

const home = (layout: Record<string, unknown>) => ({
  id: HOME_ID,
  name: "My Home",
  layout,
  overallScore: 100,
  ruleSetId: "aroha-traditional-v1",
  archived: false,
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
});

function vastuMocks(over: Handlers = {}): Handlers {
  return {
    // Exact keys win over "GET /v1/vastu/:id", so /homes is never answered as a plan.
    "GET /v1/vastu/homes": () => ({ json: { homes: [] } }),
    "POST /v1/vastu/homes": (c) => ({ status: 201, json: home((c.body as { layout: Record<string, unknown> }).layout) }),
    "PATCH /v1/vastu/homes/:id": (c) => ({ json: home((c.body as { layout: Record<string, unknown> }).layout ?? {}) }),
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

  test("the plan is saved to the account and edits follow it", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { overrides: vastuMocks() });
    await signIn(page, "/vastu");

    // First visit: the starter plan becomes the profile's first saved home.
    await expect(page.getByTestId("vastu-save-status")).toHaveText(/Saved/);
    expect(callsTo(api, "POST /v1/vastu/homes")).toHaveLength(1);

    await page.getByRole("button", { name: /Dining/ }).click();
    await expect.poll(() => callsTo(api, `PATCH /v1/vastu/homes/${HOME_ID}`).length).toBeGreaterThan(0);
    const patch = callsTo(api, `PATCH /v1/vastu/homes/${HOME_ID}`).at(-1)?.body as { layout: { rooms: { type: string }[] } };
    expect(patch.layout.rooms.map((r) => r.type)).toContain("dining");
  });

  test("a saved home loads from the account", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      overrides: vastuMocks({
        "GET /v1/vastu/homes": () => ({
          json: { homes: [home({ plot: square, northOffsetDeg: 0, rooms: [{ id: "k1", type: "kitchen", x: 9, y: 9, w: 3, h: 3, fixtures: [] }] })] },
        }),
      }),
    });
    await signIn(page, "/vastu");

    const list = page.getByRole("heading", { name: "Live Vastu Analysis" }).locator("..").getByRole("listitem");
    await expect(list).toHaveCount(1);
    await expect(list.first()).toContainText("Kitchen");
    await expect(list.first()).toContainText("Highly Beneficial");
    expect(callsTo(api, "POST /v1/vastu/homes")).toHaveLength(0);
  });

  test("a room outside the home outline blocks the report", async ({ page }) => {
    await skipLaunchOverlays(page);
    const lShape = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 6 },
      { x: 12, y: 6 },
      { x: 12, y: 12 },
      { x: 0, y: 12 },
    ];
    await mockApi(page, {
      overrides: vastuMocks({
        "GET /v1/vastu/homes": () => ({
          json: { homes: [home({ plot: lShape, northOffsetDeg: 0, rooms: [{ id: "b1", type: "bathroom", x: 8, y: 1, w: 2, h: 2, fixtures: [] }] })] },
        }),
      }),
    });
    await signIn(page, "/vastu");

    await expect(page.getByText("1 room is outside the home outline")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Generate Report/ })).toBeDisabled();
    await expect(page.getByText("Move every room inside the home outline before generating a report.")).toBeVisible();
  });

  test("a report still being written picks up again after a reload", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      overrides: vastuMocks({
        "GET /v1/vastu": () => ({
          json: { plans: [plan({ status: "processing", overallScore: null, createdAt: new Date().toISOString() })] },
        }),
      }),
    });
    await signIn(page, "/vastu");

    await expect(page.getByText("Your north-east is open and bright.")).toBeVisible();
    expect(callsTo(api, "POST /v1/vastu/analyze")).toHaveLength(0);
  });

  test("the daily limit gets its own message", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: vastuMocks({
        "POST /v1/vastu/analyze": () => ({
          status: 429,
          json: { error: { code: "TOO_MANY_REQUESTS", message: "You've reached today's limit of 20 Vastu reports. Try again tomorrow." } },
        }),
      }),
    });
    await signIn(page, "/vastu");

    await generate(page);
    await expect(page.getByText("You've reached today's Vastu report limit. Please try again tomorrow.")).toBeVisible();
  });

  test("the report card is hidden while paid.vastu is switched off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "paid.vastu": { enabled: false, pricePaise: null, originalPricePaise: null } } },
      overrides: vastuMocks(),
    });
    await signIn(page, "/vastu");

    await expect(page.getByRole("heading", { name: "Live Vastu Analysis" })).toBeVisible();
    await expect(page.getByText("AI Vastu Report")).toHaveCount(0);
  });

  test("an old report reopens its floor plan", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: vastuMocks({
        "GET /v1/vastu": () => ({
          json: {
            plans: [
              plan({
                analysis: ANALYSIS,
                language: "en",
                layout: { plot: square, northOffsetDeg: 0, rooms: [{ id: "s1", type: "store", x: 0, y: 9, w: 3, h: 3, fixtures: [] }] },
              }),
            ],
          },
        }),
      }),
    });
    await signIn(page, "/vastu");

    await page.getByRole("button", { name: /72/ }).click();
    await page.getByRole("button", { name: "Open this plan" }).click();
    await page.getByRole("button", { name: "Open this plan" }).click();
    const list = page.getByRole("heading", { name: "Live Vastu Analysis" }).locator("..").getByRole("listitem");
    await expect(list).toHaveCount(1);
    await expect(list.first()).toContainText("Store");
  });
});
