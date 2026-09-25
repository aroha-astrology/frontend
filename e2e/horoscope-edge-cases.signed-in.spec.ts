import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { makeHoroscope } from "./fixtures/data";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const serverError = { status: 500, json: { error: { code: "INTERNAL", message: "e2e" } } };

function signForecast(signIndex: number) {
  const reading = { hook: `Steady progress for sign ${signIndex}`, description: "A calm day.", advice: "Keep going.", quality: "good", score: 4 };
  return {
    forecast: {
      period: "daily",
      sign: String(signIndex),
      date: "2026-09-24",
      transitMoonSign: "Taurus",
      houseFromSign: 2,
      favorable: true,
      isAshtamaChandra: false,
      ...reading,
      luckyColor: "Gold",
      luckyNumber: 7,
      keyTransits: [],
      categories: { overall: reading, health: reading, career: reading, marriage: reading, finance: reading, education: reading },
    },
  };
}

test.describe("Horoscope edge cases", () => {
  test("sign readings that fail to load offer a retry instead of made-up text and stars", async ({ page }) => {
    await skipLaunchOverlays(page);
    let failing = true;
    const api = await mockApi(page, {
      overrides: {
        "GET /v1/forecast/moon-sign/:sign": (c) => (failing ? serverError : { json: signForecast(Number(c.path.split("/").pop())) }),
      },
    });
    await signIn(page, "/horoscope");

    const error = page.getByTestId("signs-error");
    await expect(error).toContainText("Something went wrong");
    await expect(page.getByText("Cosmic energies align for you today.")).toHaveCount(0);

    failing = false;
    const before = api.calls.filter((c) => c.path.startsWith("/v1/forecast/moon-sign/")).length;
    await error.getByRole("button", { name: "Try Again" }).click();
    await expect(page.getByText("Steady progress for sign 0")).toBeVisible();
    await expect(page.getByTestId("signs-error")).toHaveCount(0);
    expect(api.calls.filter((c) => c.path.startsWith("/v1/forecast/moon-sign/")).length).toBeGreaterThan(before);
  });

  test("one sign that fails says so and retries on tap, while the rest show their readings", async ({ page }) => {
    await skipLaunchOverlays(page);
    let failAries = true;
    await mockApi(page, {
      overrides: {
        "GET /v1/forecast/moon-sign/:sign": (c) => {
          const idx = Number(c.path.split("/").pop());
          return idx === 0 && failAries ? serverError : { json: signForecast(idx) };
        },
      },
    });
    await signIn(page, "/horoscope");

    await expect(page.getByText("Steady progress for sign 1", { exact: true })).toBeVisible();
    const retryCard = page.getByText("Couldn't load. Tap to try again.");
    await expect(retryCard).toHaveCount(1);

    failAries = false;
    await retryCard.click();
    await expect(page.getByText("Steady progress for sign 0")).toBeVisible();
    await expect(page.getByText("Couldn't load. Tap to try again.")).toHaveCount(0);
  });

  test("a personal reading that fails shows a message with Try again", async ({ page }) => {
    await skipLaunchOverlays(page);
    let failing = true;
    await mockApi(page, {
      overrides: {
        "GET /v1/horoscope": (c) => (failing ? serverError : { json: makeHoroscope(c.query.get("period") ?? "daily") }),
      },
    });
    await signIn(page, "/horoscope");

    const card = page.getByTestId("personalized-error");
    await expect(card).toContainText("Something went wrong");
    failing = false;
    await card.getByRole("button", { name: "Try Again" }).click();
    await expect(page.getByText("A clear, steady day").first()).toBeVisible();
  });

  test("the yearly tab opens the month-by-month reading", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: {
        "GET /v1/horoscope": (c) => {
          const period = c.query.get("period") ?? "daily";
          if (period !== "yearly") return { json: makeHoroscope(period) };
          return {
            json: {
              forDate: "2026-01-01",
              period: "yearly",
              periodKey: "2026",
              summary: "A year of slow, solid building.",
              monthlyBreakdown: [
                { month: 1, monthLabel: "January", summary: "Plan the year's big moves." },
                { month: 2, monthLabel: "February", summary: "Money matters settle down." },
              ],
              model: "e2e",
              generatedAt: "2026-01-01T00:00:00.000Z",
            },
          };
        },
      },
    });
    await signIn(page, "/horoscope");

    await page.getByRole("button", { name: "Yearly", exact: true }).click();
    await expect(page.getByText("A year of slow, solid building.").first()).toBeVisible();
    await page.getByRole("button", { name: "Month by month" }).click();
    await expect(page.getByText("Money matters settle down.")).toBeVisible();
  });
});
