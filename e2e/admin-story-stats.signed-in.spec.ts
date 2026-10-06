import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/** The least the Overview page needs to draw itself; everything else on it copes with a 404. */
const OVERVIEW = {
  range: { from: "2026-09-08", to: "2026-10-07" },
  cashInPaise: 0,
  orderCount: 0,
  walletSpendPaise: 0,
  walletLiabilityPaise: 0,
  payingUsers: 0,
  arpuPaise: 0,
  newUsers: 0,
  activeUsers: 0,
  timeSeries: [],
  spendByFeature: [],
  topUpFunnel: [],
  llmCostByAgent: [],
};

const STORY_STATS = {
  visitors: 42,
  views: 93,
  sharers: 8,
  shares: 13,
  shareChannels: { whatsapp: 9, instagramStory: 4 },
  stories: [
    { storyId: "panchang", viewers: 40, shares: 0, shareChannels: {} },
    { storyId: "hora", viewers: 31, shares: 7, shareChannels: { whatsapp: 7 } },
    { storyId: "deity", viewers: 12, shares: 0, shareChannels: {} },
    { storyId: "gita", viewers: 10, shares: 6, shareChannels: { whatsapp: 2, instagramStory: 4 } },
  ],
};

const ADMIN_API: Handlers = {
  "GET /v1/admin/overview": () => ({ json: OVERVIEW }),
  "GET /v1/admin/story-stats": () => ({ json: STORY_STATS }),
};

test.describe("Admin → Overview → Daily Stories", () => {
  test("shows visitors, and share clicks with the places in brackets, overall and per story", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { isAdmin: true }, overrides: ADMIN_API });
    await signIn(page, "/admin");

    const card = page.getByTestId("admin-story-stats");
    await expect(card.getByRole("heading", { name: "Daily Stories" })).toBeVisible();
    await expect(card.getByTestId("story-stats-visitors")).toHaveText("42");
    await expect(card.getByTestId("story-stats-shares")).toHaveText("13 (WhatsApp 9, Instagram Story 4)");
    await expect(card.getByText("by 8 people")).toBeVisible();

    // One place: just its name. Several: each with its count. None: the bare number.
    await expect(card.getByTestId("story-stats-row-panchang")).toHaveText(/Panchang\s*40\s*0$/);
    await expect(card.getByTestId("story-stats-row-hora")).toHaveText(/Hora\s*31\s*7 \(WhatsApp\)$/);
    await expect(card.getByTestId("story-stats-row-gita")).toHaveText(/Gita\s*10\s*6 \(Instagram Story 4, WhatsApp 2\)$/);

    // It follows the page's date range: the default first, then whatever is picked.
    expect(callsTo(api, "GET /v1/admin/story-stats")[0]!.query.get("preset")).toBe("last30d");
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect.poll(() => callsTo(api, "GET /v1/admin/story-stats").at(-1)!.query.get("preset")).toBe("today");
  });

  test("stays off the page when the backend has no story numbers to give", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { isAdmin: true }, overrides: { "GET /v1/admin/overview": () => ({ json: OVERVIEW }) } });
    await signIn(page, "/admin");

    await expect(page.getByText("Wallet Liability")).toBeVisible();
    await expect(page.getByTestId("admin-story-stats")).toHaveCount(0);
  });
});
