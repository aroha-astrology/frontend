import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

const ITEMS = [
  { id: "remedy", kind: "chant", slug: "shanti-mantra", japCount: 3, reason: "A calm mind helps with today's pressure.", why: [] },
  {
    id: "dasha",
    kind: "chant",
    slug: "hanuman-gayatri",
    japCount: 108,
    why: [{ kind: "dasha", planet: "Saturn", level: "antardasha", effect: 0, textKey: "practice.why.dasha", params: { planet: "Saturn", until: "2027-03-01" } }],
  },
  {
    id: "weekday",
    kind: "chant",
    slug: "vishnu-shantakaram",
    japCount: 11,
    why: [{ kind: "panchang", effect: 0, textKey: "practice.why.weekday", params: { weekday: 4 } }],
  },
  {
    id: "lalKitab",
    kind: "action",
    lalKitab: { house: 8, lines: [0, 1] },
    why: [{ kind: "transit", planet: "Moon", house: 8, effect: -1, textKey: "decide.why.chandrashtama", params: { house: 8 } }],
  },
];

function practice(done: string[]) {
  return {
    date: today(),
    items: ITEMS,
    done,
    streak: done.length ? 3 : 2,
    week: Array.from({ length: 7 }, (_, i) => ({ date: `2026-09-${19 + i}`, done: i > 3 ? 1 : 0 })),
    monthDays: 9,
  };
}

test.describe("Today's Practice (roadmap step 9)", () => {
  test("the page and Home card stay hidden while the flags are off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/practice");
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByTestId("practice-card")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/practice/today")).toHaveLength(0);
  });

  test("Home's card lists the items and ticks one off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const done: string[] = [];
    const api = await mockApi(page, {
      user: { features: { "home.dailyPractice": ON } },
      overrides: {
        "GET /v1/practice/today": () => ({ json: practice(done) }),
        "POST /v1/practice/complete": (c) => {
          done.push((c.body as { itemId: string }).itemId);
          return { json: practice(done) };
        },
      },
    });
    await signIn(page, "/");

    const card = page.getByTestId("practice-card");
    await expect(card.getByText("For your Saturn period")).toBeVisible();
    await expect(card.getByText("Thursday's prayer")).toBeVisible();
    await expect(card.getByText("0 of 4 done")).toBeVisible();
    await card.getByRole("button", { name: "Mark as done" }).nth(2).click();
    await expect(card.getByText("1 of 4 done")).toBeVisible();
    expect(callsTo(api, "POST /v1/practice/complete")[0]!.body).toEqual({ itemId: "weekday" });
    await expect(card.getByRole("link", { name: /Open practice/ })).toHaveCount(0);
  });

  test("the page explains each item, chants on the mala and logs a finished jap", async ({ page }) => {
    await skipLaunchOverlays(page);
    const done: string[] = [];
    const api = await mockApi(page, {
      user: { features: { "nav.dailyPractice": ON } },
      overrides: {
        "GET /v1/practice/today": () => ({ json: practice(done) }),
        "POST /v1/practice/complete": (c) => {
          done.push((c.body as { itemId: string }).itemId);
          return { json: practice(done) };
        },
      },
    });
    await signIn(page, "/practice");

    await expect(page.getByTestId("practice-summary").getByText("Practised on 9 of the last 30 days")).toBeVisible();
    const dasha = page.getByTestId("practice-item-dasha");
    await expect(dasha.getByText("This mantra is traditionally chanted for Saturn; your Saturn period runs until Mar 2027.")).toBeVisible();
    await expect(dasha.getByText(/108 times/)).toBeVisible();

    const lal = page.getByTestId("practice-item-lalKitab");
    await expect(lal.getByText("Avoid large bodies of water; practise pranayama (breath meditation)")).toBeVisible();
    await lal.getByRole("button", { name: "Mark as done" }).click();
    await expect(lal.getByText("Done")).toBeVisible();

    // Reaching the mala's target logs the item. (Bead taps play audio and wait for it
    // to end, which headless Chromium can't be relied on for, so lower the target to 1.)
    const remedy = page.getByTestId("practice-item-remedy");
    await expect(remedy.getByText("A calm mind helps with today's pressure.")).toBeVisible();
    await remedy.getByRole("button", { name: "Chant" }).click();
    await expect(remedy.getByRole("button", { name: "Tap the Rudraksha to chant" })).toBeVisible();
    await remedy.getByRole("spinbutton", { name: "Number of chants" }).fill("1");
    await expect.poll(() => callsTo(api, "POST /v1/practice/complete").map((c) => (c.body as { itemId: string }).itemId)).toEqual([
      "lalKitab",
      "remedy",
    ]);
    await expect(page.getByTestId("practice-summary").getByText("2 of 4 done")).toBeVisible();
  });
});
