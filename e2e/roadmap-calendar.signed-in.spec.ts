import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

function inDays(n: number): string {
  const d = new Date(Date.now() + n * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

const CALENDAR = {
  from: inDays(0),
  to: inDays(119),
  events: [
    {
      id: "ingress:Saturn",
      kind: "ingress",
      date: inDays(10),
      endDate: inDays(100),
      area: "career",
      tone: -1,
      weight: 100,
      params: { planet: "Saturn", sign: "Aries", house: 10 },
      why: [
        { kind: "transit", planet: "Saturn", house: 10, sign: "Aries", effect: -1, textKey: "why.transit", params: { planet: "Saturn", house: 10, sign: "Aries" } },
      ],
    },
    { id: "festival:x", kind: "festival", date: inDays(20), tone: 0, weight: 40, params: { name: "Diwali", emoji: "🪔" }, why: [] },
    {
      id: "window:y",
      kind: "areaWindow",
      date: inDays(30),
      endDate: inDays(60),
      area: "money",
      tone: 1,
      weight: 60,
      params: { planet: "Jupiter", level: "pratyantardasha" },
      why: [],
    },
  ],
};

test.describe("Aroha Calendar (roadmap step 3)", () => {
  test("the page, menu entry and Home card stay hidden while the flags are off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/calendar");
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByText("Next important window")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/calendar")).toHaveLength(0);
  });

  test("with the flags on, Home shows the next window and the calendar opens an event", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "nav.calendar": ON, "home.nextWindow": ON } },
      overrides: { "GET /v1/calendar": () => ({ json: CALENDAR }) },
    });
    await signIn(page, "/");

    await expect(page.getByText("Next important window")).toBeVisible();
    await expect(page.getByText("Saturn enters Aries").first()).toBeVisible();

    await page.getByRole("link", { name: /Explore calendar/ }).click();
    await page.waitForURL("**/calendar");
    await expect(page.getByText("🪔 Diwali")).toBeVisible();
    await expect(page.getByText("Money window opens")).toBeVisible();

    await page.getByRole("button", { name: /Festivals/ }).click();
    await expect(page.getByText("Money window opens")).toHaveCount(0);
    await page.getByRole("button", { name: /^All$/ }).click();

    await page.getByRole("button", { name: /Saturn enters Aries/ }).click();
    await expect(page.getByText("Your 10th house (career), counted from your Moon")).toBeVisible();
    const ask = page.getByRole("link", { name: /Ask Aroha about this/ });
    await expect(ask).toHaveAttribute("href", /\/ai-chat\?q=/);
  });
});
