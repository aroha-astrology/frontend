import { test, expect } from "@playwright/test";
import { mockApi, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Audit Sprint 6 (L9, L10): the AI cost table shows how much input came from Gemini's cache, and
// voice as minutes of audio with a price, instead of being missing from the table.

const OVERVIEW = {
  range: { from: "2026-11-01", to: "2026-11-08" },
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
  llmCostByAgent: [
    {
      agent: "chat",
      tokensIn: 100000, tokensOut: 2000, calls: 10,
      paidTokensIn: 40000, paidTokensOut: 800, paidCalls: 4,
      cachedTokensIn: 70000, paidCachedTokensIn: 28000,
      cacheReportedCalls: 10, tokensInOfCacheReportedCalls: 100000,
      audioSeconds: 0, paidAudioSeconds: 0,
    },
    {
      // Written before the cache column existed: no figure, so a dash and never 0%.
      agent: "horoscope",
      tokensIn: 50000, tokensOut: 9000, calls: 5,
      paidTokensIn: 0, paidTokensOut: 0, paidCalls: 0,
      cachedTokensIn: 0, paidCachedTokensIn: 0,
      cacheReportedCalls: 0, tokensInOfCacheReportedCalls: 0,
      audioSeconds: 0, paidAudioSeconds: 0,
    },
    {
      agent: "voice",
      tokensIn: 0, tokensOut: 0, calls: 3,
      paidTokensIn: 0, paidTokensOut: 0, paidCalls: 2,
      cachedTokensIn: 0, paidCachedTokensIn: 0,
      cacheReportedCalls: 0, tokensInOfCacheReportedCalls: 0,
      audioSeconds: 180, paidAudioSeconds: 120,
    },
  ],
};

const ADMIN_API: Handlers = { "GET /v1/admin/overview": () => ({ json: OVERVIEW }) };

test.describe("Admin → Overview → AI cost by feature", () => {
  test("shows the cache hit rate and voice minutes", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { isAdmin: true }, overrides: ADMIN_API });
    await signIn(page, "/admin");

    // The Cache hit column is the fifth cell of a row: feature, tokens in, tokens out, calls, cache hit.
    const chat = page.getByRole("row", { name: /^chat / });
    await expect(chat.getByRole("cell").nth(4)).toHaveText("70%");

    // Older rows have no figure: a dash, not 0%.
    const horoscope = page.getByRole("row", { name: /^horoscope / });
    await expect(horoscope.getByRole("cell").nth(4)).toHaveText("–");

    // Voice: 3 minutes of audio in place of the token cells, and it carries a price like any other row.
    const voice = page.getByRole("row", { name: /^voice / });
    await expect(voice.getByRole("cell").nth(1)).toHaveText("3 min of audio");
    await expect(voice).toContainText("₹");
    await expect(page.getByRole("columnheader", { name: "Cache hit" })).toBeVisible();
  });
});
