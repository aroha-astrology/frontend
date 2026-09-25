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
const HOME_2 = "88888888-8888-4888-8888-888888888888";

const square = [
  { x: 0, y: 0 },
  { x: 12, y: 0 },
  { x: 12, y: 12 },
  { x: 0, y: 12 },
];

/** Kitchen SE (ideal) + bathroom NE (correction advised). */
const LAYOUT = {
  plot: square,
  northOffsetDeg: 0,
  rooms: [
    { id: "k1", type: "kitchen", x: 9, y: 9, w: 3, h: 3, fixtures: [] },
    { id: "b1", type: "bathroom", x: 9, y: 0, w: 3, h: 3, fixtures: [] },
  ],
};

const home = (layout: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  id: HOME_ID,
  name: "My Home",
  layout,
  overallScore: 100,
  ruleSetId: "aroha-traditional-v1",
  archived: false,
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
  ...over,
});

function vastuMocks(over: Handlers = {}): Handlers {
  return {
    // Exact keys win over "GET /v1/vastu/:id", so /homes is never answered as a plan.
    "GET /v1/vastu/homes": () => ({ json: { homes: [home(LAYOUT)] } }),
    "POST /v1/vastu/homes": (c) => ({ status: 201, json: home((c.body as { layout: Record<string, unknown> }).layout) }),
    "PATCH /v1/vastu/homes/:id": (c) => ({ json: home((c.body as { layout?: Record<string, unknown> }).layout ?? LAYOUT) }),
    "GET /v1/vastu": () => ({ json: { plans: [] } }),
    "POST /v1/vastu/analyze": () => ({ json: { planId: PLAN_ID } }),
    "GET /v1/vastu/:id": () => ({ json: plan({ analysis: ANALYSIS }) }),
    ...over,
  };
}

async function generate(page: Page) {
  await page.getByRole("button", { name: /^Generate report/ }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
}

/** Every room's row in the analysis ("All rooms" expanded). */
async function allRooms(page: Page) {
  await page.getByRole("button", { name: /^All rooms/ }).click();
  return page.getByTestId("vastu-all-rooms").getByRole("listitem");
}

async function open(page: Page, overrides: Handlers = {}, user?: Parameters<typeof mockApi>[1]["user"]) {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user, overrides: vastuMocks(overrides) });
  await signIn(page, "/vastu");
  return api;
}

test.describe("Vastu Studio", () => {
  test("generating a report charges once and shows the remedies", async ({ page }) => {
    const api = await open(page);
    await expect(page.getByTestId("vastu-score-card")).toBeVisible();
    await generate(page);

    await expect(page.getByText("AI Remedies & Solutions")).toBeVisible();
    await expect(page.getByText("Your north-east is open and bright.")).toBeVisible();
    expect(callsTo(api, "POST /v1/vastu/analyze")).toHaveLength(1);
  });

  test("a failed report says the charge was refunded", async ({ page }) => {
    await open(page, { "GET /v1/vastu/:id": () => ({ json: plan({ status: "error", overallScore: null }) }) });
    await generate(page);
    await expect(
      page.getByText("Could not generate the report. Any amount charged has been refunded to your wallet."),
    ).toBeVisible();
  });

  test("a slow report says it's still being written instead of failing", async ({ page }) => {
    await page.clock.install();
    await open(page, { "GET /v1/vastu/:id": () => ({ json: plan({ status: "processing", overallScore: null }) }) });

    await generate(page);
    await expect(page.getByTestId("vastu-progress")).toBeVisible();
    const note = page.getByTestId("vastu-still-working");
    for (let i = 0; i < 80 && !(await note.count()); i++) await page.clock.fastForward("00:03");
    await expect(note).toHaveText(
      "This is taking longer than usual. Your report will appear in the list below when it's ready.",
    );
    await expect(page.getByText("Could not generate the report")).toHaveCount(0);
  });

  test("history rows show a readable status for unfinished plans", async ({ page }) => {
    await open(page, {
      "GET /v1/vastu": () => ({
        json: {
          plans: [
            plan({ id: "a", status: "processing", overallScore: null }),
            plan({ id: "b", status: "error", overallScore: null }),
          ],
        },
      }),
    });
    await expect(page.getByText("Working…")).toBeVisible();
    await expect(page.getByText("Failed · refunded")).toBeVisible();
    await expect(page.getByText("processing", { exact: true })).toHaveCount(0);
  });

  test("a short wallet points to recharge instead of generating", async ({ page }) => {
    const api = await open(page, {}, { walletBalancePaise: 0 });
    await expect(page.getByRole("link", { name: "Recharge Wallet" })).toHaveAttribute("href", "/payment");
    await expect(page.getByRole("button", { name: /^Generate report/ })).toHaveCount(0);
    expect(callsTo(api, "POST /v1/vastu/analyze")).toHaveLength(0);
  });

  test("first visit asks how to start, then saves that home to the account", async ({ page }) => {
    const api = await open(page, { "GET /v1/vastu/homes": () => ({ json: { homes: [] } }) });

    await expect(page.getByTestId("vastu-start")).toBeVisible();
    await page.getByTestId("vastu-start-2bhk").click();
    await expect(page.getByTestId("vastu-save-status")).toHaveText(/Saved/);
    const created = callsTo(api, "POST /v1/vastu/homes");
    expect(created).toHaveLength(1);
    expect((created[0]?.body as { layout: { rooms: unknown[] } }).layout.rooms.length).toBe(7);

    // Edits follow it up to the account.
    await page.getByTestId("vastu-add-room").click();
    await page.getByTestId("vastu-room-sheet").getByRole("button", { name: /Store/ }).click();
    await expect.poll(() => callsTo(api, `PATCH /v1/vastu/homes/${HOME_ID}`).length).toBeGreaterThan(0);
    const patch = callsTo(api, `PATCH /v1/vastu/homes/${HOME_ID}`).at(-1)?.body as { layout: { rooms: { type: string }[] } };
    expect(patch.layout.rooms.map((r) => r.type)).toContain("store");
  });

  test("a saved home loads from the account", async ({ page }) => {
    const api = await open(page);
    const rows = await allRooms(page);
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "Kitchen" })).toContainText("Highly Beneficial");
    await expect(rows.filter({ hasText: "Bathroom" })).toContainText("Correction Advised");
    expect(callsTo(api, "POST /v1/vastu/homes")).toHaveLength(0);
  });

  test("undo and redo step through edits", async ({ page }) => {
    await open(page);
    await expect(page.getByTestId("vastu-undo")).toBeDisabled();
    await page.getByTestId("vastu-add-room").click();
    await page.getByTestId("vastu-room-sheet").getByRole("button", { name: /Dining/ }).click();
    const rows = await allRooms(page);
    await expect(rows).toHaveCount(3);
    await page.getByTestId("vastu-undo").click();
    await expect(rows).toHaveCount(2);
    await page.getByTestId("vastu-redo").click();
    await expect(rows).toHaveCount(3);
  });

  test("Fix this previews a better spot, applies it, and can be undone", async ({ page }) => {
    await open(page);
    const issue = page.getByTestId("vastu-issue").filter({ hasText: "Bathroom" });
    await issue.getByRole("button", { name: "Fix this" }).click();

    await expect(page.getByTestId("vastu-fix-bar")).toBeVisible();
    await expect(page.getByTestId("vastu-ghost")).toBeVisible();
    await expect(page.getByTestId("vastu-fix-option").first()).toContainText("NW");
    await page.getByTestId("vastu-fix-apply").click();

    await expect(page.getByTestId("vastu-issue")).toHaveCount(0);
    await expect(page.getByText("Nothing needs correcting")).toBeVisible();
    await page.getByTestId("vastu-room-bar").getByRole("button", { name: "Close" }).click();
    await page.getByTestId("vastu-undo").click();
    await expect(page.getByTestId("vastu-issue")).toHaveCount(1);
  });

  test("Why? explains a rating without AI", async ({ page }) => {
    const api = await open(page);
    await page.getByTestId("vastu-issue").getByRole("button", { name: "Why?" }).click();
    const why = page.getByTestId("vastu-why");
    await expect(why).toContainText("advises against Bathroom in the North-East");
    await expect(why).toContainText("NW");
    expect(api.calls.filter((c) => c.path.startsWith("/v1/vastu/analyze"))).toHaveLength(0);
  });

  test("Show me turns on the Vastu Lens for that room", async ({ page }) => {
    await open(page);
    await page.getByTestId("vastu-issue").getByRole("button", { name: "Show me" }).click();
    await expect(page.getByTestId("vastu-lens")).toBeVisible();
    await expect(page.getByRole("tab", { name: /Vastu Lens/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("vastu-room-badge")).toContainText("Correction Advised");
    await expect(page.getByTestId("vastu-lens-caption")).toContainText("Bathroom");
  });

  test("switching homes loads the other plan", async ({ page }) => {
    await open(page, {
      "GET /v1/vastu/homes": () => ({
        json: {
          homes: [
            home(LAYOUT),
            home({ plot: square, northOffsetDeg: 0, rooms: [{ id: "s1", type: "store", x: 0, y: 9, w: 3, h: 3, fixtures: [] }] }, { id: HOME_2, name: "Farm House", updatedAt: "2026-09-19T10:00:00.000Z" }),
          ],
        },
      }),
    });
    await page.getByTestId("vastu-home-switch").click();
    await page.getByTestId("vastu-homes").getByRole("button", { name: /Farm House/ }).click();
    await expect(page.getByTestId("vastu-home-switch")).toContainText("Farm House");
    const rows = await allRooms(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Store");
  });

  test("a room outside the home outline blocks the report", async ({ page }) => {
    const lShape = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 6 },
      { x: 12, y: 6 },
      { x: 12, y: 12 },
      { x: 0, y: 12 },
    ];
    await open(page, {
      "GET /v1/vastu/homes": () => ({
        json: { homes: [home({ plot: lShape, northOffsetDeg: 0, rooms: [{ id: "b1", type: "bathroom", x: 8, y: 1, w: 2, h: 2, fixtures: [] }] })] },
      }),
    });
    await expect(page.getByText("1 room is outside the home outline")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Generate report/ })).toBeDisabled();
    await expect(page.getByText("Move every room inside the home outline before generating a report.")).toBeVisible();
  });

  test("a report still being written picks up again after a reload", async ({ page }) => {
    const api = await open(page, {
      "GET /v1/vastu": () => ({
        json: { plans: [plan({ status: "processing", overallScore: null, createdAt: new Date().toISOString() })] },
      }),
    });
    await expect(page.getByText("Your north-east is open and bright.")).toBeVisible();
    expect(callsTo(api, "POST /v1/vastu/analyze")).toHaveLength(0);
  });

  test("the daily limit gets its own message", async ({ page }) => {
    await open(page, {
      "POST /v1/vastu/analyze": () => ({
        status: 429,
        json: { error: { code: "TOO_MANY_REQUESTS", message: "You've reached today's limit of 20 Vastu reports. Try again tomorrow." } },
      }),
    });
    await generate(page);
    await expect(page.getByText("You've reached today's Vastu report limit. Please try again tomorrow.")).toBeVisible();
  });

  test("the report card is hidden while paid.vastu is switched off", async ({ page }) => {
    await open(page, {}, { features: { "paid.vastu": { enabled: false, pricePaise: null, originalPricePaise: null } } });
    await expect(page.getByTestId("vastu-score-card")).toBeVisible();
    await expect(page.getByTestId("vastu-report-card")).toHaveCount(0);
  });

  test("an old report reopens its floor plan", async ({ page }) => {
    await open(page, {
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
    });
    await page.getByRole("button", { name: /72/ }).click();
    await page.getByRole("button", { name: "Open this plan" }).click();
    await page.getByRole("button", { name: "Open this plan" }).click();
    const rows = await allRooms(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Store");
  });
});
