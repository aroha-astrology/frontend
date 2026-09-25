import { test, expect } from "@playwright/test";
import { mockApi, callsTo, passStatus, PASS_REQUIRED } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

function inDays(n: number): string {
  const d = new Date(Date.now() + n * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

const LIST = { items: [] };

function result(kind: "decision" | "muhurta", category: string) {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    kind,
    category,
    question: kind === "decision" ? "Should I take the new offer?" : null,
    place: { name: kind === "decision" ? "Delhi, India" : "Pune", lat: 18.52, lon: 73.85, tz: "Asia/Kolkata" },
    from: inDays(0),
    to: inDays(59),
    personal: true,
    approximateBirthTime: false,
    days: Array.from({ length: 60 }, (_, i) => ({
      date: inDays(i),
      score: i % 7 === 0 ? 76 : i % 11 === 0 ? 20 : 50,
      tone: i % 7 === 0 ? "good" : i % 11 === 0 ? "caution" : "neutral",
      avoid: [],
    })),
    windows: [{ start: inDays(3), end: inDays(12), tone: "good", score: 66 }],
    best: [
      {
        date: inDays(7),
        score: 76,
        time: { start: "11:48", end: "12:36", name: "abhijit" },
        rahuKaal: { start: "13:30", end: "15:00" },
        why: [
          { kind: "panchang", effect: 1, textKey: "decide.why.nakshatraGood", params: { nakshatra: "Pushya" } },
          { kind: "panchang", effect: 1, textKey: "decide.why.weekdayGood", params: { weekday: 4 } },
        ],
      },
    ],
    caution: [
      {
        date: inDays(11),
        score: 20,
        why: [{ kind: "panchang", effect: -1, textKey: "decide.why.tithiBad", params: { tithi: 9 } }],
      },
    ],
    pricePaidPaise: 4900,
    createdAt: new Date().toISOString(),
  };
}

test.describe("Decision Astrology + Find My Date (roadmap step 6)", () => {
  test("both pages bounce home while the flags are off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/decide");
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto("/find-date");
    await page.waitForURL((url) => url.pathname === "/");
    expect(callsTo(api, "GET /v1/decisions")).toHaveLength(0);
    expect(callsTo(api, "POST /v1/decisions")).toHaveLength(0);
  });

  test("a decision with the Pass: pick, ask, and see windows, strongest dates and dates to avoid", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "nav.decisions": ON } },
      overrides: {
        "GET /v1/decisions": () => ({ json: LIST }),
        "POST /v1/decisions": () => ({ json: result("decision", "careerChange") }),
      },
    });
    await signIn(page, "/decide");

    await page.getByRole("button", { name: "Changing job or career" }).click();
    await page.getByPlaceholder(/Should I take the offer/).fill("Should I take the new offer?");
    await page.getByRole("button", { name: "60 days" }).click();
    await expect(page.getByText(/₹/)).toHaveCount(0);
    await page.getByRole("button", { name: "Show my windows" }).click();

    const view = page.getByTestId("decision-result");
    await expect(view.getByText("Should I take the new offer?")).toBeVisible();
    await expect(view.getByText("Favourable window")).toBeVisible();
    const best = view.getByTestId("best-date");
    await expect(best.getByText("Best time: Abhijit Muhurta 11:48–12:36")).toBeVisible();
    await expect(best.getByText("The Moon is in Pushya, a traditionally favourable star for this.")).toBeVisible();
    await expect(best.getByText("Thursday suits this kind of beginning.")).toBeVisible();
    await expect(best.getByRole("link", { name: /Ask Aroha about this/ })).toHaveAttribute("href", /\/ai-chat\?q=/);
    await expect(view.getByText("A Rikta tithi, traditionally avoided for new beginnings.")).toBeVisible();

    const sent = callsTo(api, "POST /v1/decisions");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.body).toMatchObject({ category: "careerChange", question: "Should I take the new offer?", days: 60 });
    await expect(page).toHaveURL(/\?id=11111111-2222-4333-8444-555555555555/);
  });

  test("Find My Date: defaults to the birth place and shows the best time of day", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "panchang.findMyDate": ON } },
      overrides: {
        "GET /v1/decisions": () => ({ json: LIST }),
        "POST /v1/find-date": () => ({ json: result("muhurta", "vehicle") }),
      },
    });
    await signIn(page, "/find-date");

    await page.getByRole("button", { name: "Buying a vehicle" }).click();
    await page.getByRole("button", { name: "Find my dates" }).click();
    await expect(page.getByTestId("decision-result").getByText("Buying a vehicle")).toBeVisible();
    await expect(page.getByText("Best time: Abhijit Muhurta 11:48–12:36")).toBeVisible();
    await expect(page.getByText("Favourable window")).toHaveCount(0); // windows are for decisions only

    const sent = callsTo(api, "POST /v1/find-date");
    expect(sent).toHaveLength(1);
    // The profile's birth place is the default place.
    expect(sent[0]!.body).toMatchObject({ category: "vehicle", days: 60, place: { name: "Delhi, India", tz: "Asia/Kolkata" } });
  });

  test("reopening a saved result doesn't run a new one, and a Pass that ends mid-way shows the lock", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "nav.decisions": ON } },
      overrides: {
        "GET /v1/decisions": () => ({
          json: {
            ...LIST,
            items: [
              {
                id: "11111111-2222-4333-8444-555555555555",
                kind: "decision",
                category: "marriage",
                question: "When should we marry?",
                placeName: "Delhi, India",
                from: inDays(0),
                to: inDays(59),
                topDate: inDays(7),
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }),
        "GET /v1/decisions/:id": () => ({ json: result("decision", "marriage") }),
        "POST /v1/decisions": () => PASS_REQUIRED,
      },
    });
    await signIn(page, "/decide");

    await page.getByRole("button", { name: /When should we marry\?/ }).click();
    await expect(page.getByTestId("decision-result").getByText("Marriage")).toBeVisible();
    expect(callsTo(api, "POST /v1/decisions")).toHaveLength(0);

    await page.getByRole("button", { name: "Change" }).click();
    await page.getByRole("button", { name: "Starting a business" }).click();
    await page.getByRole("button", { name: "Show my windows" }).click();
    await expect(page.getByTestId("pass-lock")).toBeVisible();
    await expect(page.getByRole("link", { name: "Add money" })).toHaveCount(0);
  });

  test("without the Pass, Decisions and Find My Date are locked behind the subscription", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: {
        features: {
          "nav.decisions": ON,
          "panchang.findMyDate": ON,
          "nav.arohaPass": ON,
          "paid.arohaPassB": { ...ON, pricePaise: 29900 },
        },
      },
      overrides: {
        "GET /v1/decisions": () => PASS_REQUIRED,
        "GET /v1/pass": () => ({ json: passStatus() }),
      },
    });
    await signIn(page, "/decide");
    const lock = page.getByTestId("pass-lock");
    await expect(lock.getByText("Decision Astrology is part of Aroha Pass")).toBeVisible();
    await expect(lock.getByRole("link", { name: "Subscribe to unlock" })).toHaveAttribute("href", "/pass");
    await expect(page.getByRole("button", { name: "Changing job or career" })).toHaveCount(0);

    await page.goto("/find-date");
    await expect(page.getByTestId("pass-lock").getByText(/is part of Aroha Pass/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Buying a vehicle" })).toHaveCount(0);
    expect(callsTo(api, "POST /v1/decisions")).toHaveLength(0);
    expect(callsTo(api, "POST /v1/find-date")).toHaveLength(0);
  });
});
