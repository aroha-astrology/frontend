import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { RitualResult, RitualToday } from "../lib/ritual";
import type { ExperienceInfo } from "../lib/experience";

// The Morning Ritual (switch ritual.morning): a Prashna card, 11 japs or 3 breaths, a mood check.
// Finishing it is the daily check-in; the server keeps the one merged streak.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const FEATURES = { "ritual.morning": ON };

const today = (over: Partial<RitualToday> = {}): RitualToday => ({
  localDate: "2026-10-23",
  timeZone: "Asia/Kolkata",
  completed: false,
  cardIndex: 0, // Ashwini, pada 1: the aim "dharma"
  basis: "moon",
  practice: null,
  mood: null,
  streak: { run: 2, shields: 1, cosmicKeys: 0, nextKeyInDays: 1, nextShieldInDays: 5 },
  ...over,
});

const finished = (over: Partial<RitualResult> = {}): RitualResult => ({
  ...today({ completed: true, practice: "jap", mood: 4, streak: { run: 3, shields: 1, cosmicKeys: 1, nextKeyInDays: 3, nextShieldInDays: 4 } }),
  alreadyDone: false,
  earned: { key: true, shield: false, shieldCoveredDate: null },
  rewardPaise: 700,
  ...over,
});

/** Holds the seal for `ms` with the mouse, as a finger would. */
async function holdSeal(page: Page, ms: number) {
  const box = (await page.getByTestId("ritual-seal").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

function ritualServer(start: RitualToday, result: RitualResult = finished()) {
  let state = start;
  const handlers: Handlers = {
    "GET /v1/ritual/today": () => ({ json: state }),
    "POST /v1/ritual/complete": () => {
      state = result;
      return { json: result };
    },
  };
  return { handlers };
}

test("Home invites the reader in, with the streak they would keep", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { features: FEATURES }, overrides: ritualServer(today()).handlers });
  await signIn(page, "/");
  const card = page.getByTestId("ritual-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Begin your morning ritual");
  await expect(card).toContainText("2-day streak");
  await card.click();
  await expect(page).toHaveURL(/\/ritual$/);
  await expect(page.getByTestId("ritual-seal")).toBeVisible();
});

test("a short press does not open the card; holding the seal does", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { features: FEATURES }, overrides: ritualServer(today()).handlers });
  await signIn(page, "/ritual");
  await expect(page.getByTestId("ritual-seal")).toBeVisible();

  await holdSeal(page, 400);
  await expect(page.getByTestId("ritual-prashna")).toHaveCount(0);

  await holdSeal(page, 1900);
  await expect(page.getByTestId("ritual-prashna")).toBeVisible();
  await expect(page.getByTestId("ritual-pada")).toContainText("Ashwini · Pada 1 · Dharma");
  await expect(page.getByTestId("ritual-theme")).toHaveText("swift healing");
  await expect(page.getByTestId("ritual-question")).toHaveText("Around swift healing: where does duty ask you to stand firm today?");
  // No exact birth time: the card says it follows the Moon alone.
  await expect(page.getByTestId("ritual-prashna")).toContainText("follows today's Moon");
});

test("the full ritual with 11 japs saves once and shows the streak, the Cosmic Key and the reward", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { features: FEATURES }, overrides: ritualServer(today()).handlers });
  await signIn(page, "/ritual");

  await holdSeal(page, 1900);
  await page.getByTestId("ritual-card-next").click();
  await page.getByTestId("ritual-pick-jap").click();

  const next = page.getByTestId("ritual-practice-next");
  await expect(next).toBeDisabled();
  for (let i = 0; i < 11; i++) await page.getByTestId("ritual-bead").click();
  await expect(page.getByTestId("ritual-jap-count")).toContainText("All 11 japs done");
  await next.click();

  const finish = page.getByTestId("ritual-finish");
  await expect(finish).toBeDisabled();
  await page.getByTestId("ritual-mood-4").click();
  await finish.click();

  await expect(page.getByTestId("ritual-done")).toBeVisible();
  await expect(page.getByTestId("ritual-streak")).toContainText("Day 3 of your streak");
  await expect(page.getByTestId("ritual-key-earned")).toBeVisible();
  await expect(page.getByTestId("ritual-done")).toContainText("Cosmic Keys: 1");
  await expect(page.getByTestId("ritual-done")).toContainText("Next Cosmic Key in 3 days");

  const posts = callsTo(api, "POST /v1/ritual/complete");
  expect(posts).toHaveLength(1);
  expect(posts[0]!.body).toEqual({ practice: "jap", mood: 4 });

  // Home now shows the slim "done" bar instead of the invitation.
  await page.getByRole("button", { name: "Back to Home" }).click();
  await expect(page.getByTestId("ritual-bar")).toContainText("Ritual done · day 3");
  await expect(page.getByTestId("ritual-card")).toHaveCount(0);
});

test("a shield that covered a missed day is said so", async ({ page }) => {
  await skipLaunchOverlays(page);
  const result = finished({ earned: { key: false, shield: false, shieldCoveredDate: "2026-10-22" }, rewardPaise: 0 });
  await mockApi(page, { user: { features: FEATURES }, overrides: ritualServer(today(), result).handlers });
  await signIn(page, "/ritual");
  await holdSeal(page, 1900);
  await page.getByTestId("ritual-card-next").click();
  await page.getByTestId("ritual-pick-jap").click();
  for (let i = 0; i < 11; i++) await page.getByTestId("ritual-bead").click();
  await page.getByTestId("ritual-practice-next").click();
  await page.getByTestId("ritual-mood-3").click();
  await page.getByTestId("ritual-finish").click();
  await expect(page.getByTestId("ritual-shield-used")).toContainText("A shield covered 2026-10-22, so your streak carries on");
  await expect(page.getByTestId("ritual-key-earned")).toHaveCount(0);
});

test("3 breaths run in and out, then the ritual can go on", async ({ page }) => {
  test.setTimeout(90_000);
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { features: FEATURES }, overrides: ritualServer(today(), finished({ earned: { key: false, shield: false, shieldCoveredDate: null } })).handlers });
  await signIn(page, "/ritual");
  await holdSeal(page, 1900);
  await page.getByTestId("ritual-card-next").click();
  await page.getByTestId("ritual-pick-breath").click();
  await page.getByTestId("ritual-breath-start").click();
  await expect(page.getByTestId("ritual-breath-phase")).toHaveText("Breathe in");
  await expect(page.getByTestId("ritual-breath-phase")).toHaveText("Breathe out", { timeout: 8_000 });
  await expect(page.getByTestId("ritual-practice-next")).toBeEnabled({ timeout: 40_000 });
  await page.getByTestId("ritual-practice-next").click();
  await page.getByTestId("ritual-mood-5").click();
  await page.getByTestId("ritual-finish").click();
  await expect(page.getByTestId("ritual-done")).toBeVisible();
  expect(callsTo(api, "POST /v1/ritual/complete")[0]!.body).toEqual({ practice: "breath", mood: 5 });
});

test("a failed save says so and the same ritual can be saved again", async ({ page }) => {
  await skipLaunchOverlays(page);
  let attempts = 0;
  await mockApi(page, {
    user: { features: FEATURES },
    overrides: {
      "GET /v1/ritual/today": () => ({ json: today() }),
      "POST /v1/ritual/complete": () => {
        attempts++;
        return attempts === 1 ? { status: 500, json: { error: { code: "INTERNAL", message: "boom" } } } : { json: finished() };
      },
    },
  });
  await signIn(page, "/ritual");
  await holdSeal(page, 1900);
  await page.getByTestId("ritual-card-next").click();
  await page.getByTestId("ritual-pick-jap").click();
  for (let i = 0; i < 11; i++) await page.getByTestId("ritual-bead").click();
  await page.getByTestId("ritual-practice-next").click();
  await page.getByTestId("ritual-mood-2").click();
  await page.getByTestId("ritual-finish").click();
  await expect(page.getByTestId("ritual-mood")).toContainText("Could not save your ritual. Try again.");
  await page.getByTestId("ritual-finish").click();
  await expect(page.getByTestId("ritual-done")).toBeVisible();
  expect(attempts).toBe(2);
});

test("opening the page after the ritual is done goes straight to the summary", async ({ page }) => {
  await skipLaunchOverlays(page);
  const done = today({ completed: true, practice: "jap", mood: 4, streak: { run: 5, shields: 2, cosmicKeys: 1, nextKeyInDays: 1, nextShieldInDays: 2 } });
  await mockApi(page, { user: { features: FEATURES }, overrides: ritualServer(done).handlers });
  await signIn(page, "/ritual");
  await expect(page.getByTestId("ritual-done")).toBeVisible();
  await expect(page.getByTestId("ritual-seal")).toHaveCount(0);
  await expect(page.getByTestId("ritual-streak")).toContainText("Day 5 of your streak");
  await expect(page.getByTestId("ritual-done")).toContainText("Shields: 2");
});

test("the Modern Cosmic look words the same card in plain terms", async ({ page }) => {
  await skipLaunchOverlays(page);
  const info: ExperienceInfo = { enabled: true, skin: "MODERN_COSMIC", picked: true, freeChangeLeft: true, canChange: true, nextAllowedAt: null };
  await mockApi(page, {
    user: { features: { ...FEATURES, "experience.picker": ON } },
    overrides: { ...ritualServer(today({ cardIndex: 5 })).handlers, "GET /v1/me/experience": () => ({ json: info }) },
  });
  await signIn(page, "/ritual");
  await holdSeal(page, 1900);
  // card 5 = Bharani (second nakshatra), pada 2: the aim "work"
  await expect(page.getByTestId("ritual-pada")).toContainText("Bharani · Pada 2 · Work");
  await expect(page.getByTestId("ritual-theme")).toHaveText("what you are carrying");
  await expect(page.getByTestId("ritual-question")).toHaveText("Around what you are carrying: what is one small thing you can build today?");
});

test("an exact birth time tunes the card to the Ascendant, and says so", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { features: FEATURES }, overrides: ritualServer(today({ basis: "moonAndLagna" })).handlers });
  await signIn(page, "/ritual");
  await holdSeal(page, 1900);
  await expect(page.getByTestId("ritual-prashna")).toContainText("Tuned to today's Moon and your Ascendant.");
});

test("with the switch off there is no card, no request, and the page sends the reader home", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: { features: { "ritual.morning": { ...ON, enabled: false } } },
    overrides: ritualServer(today()).handlers,
  });
  await signIn(page, "/");
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.getByTestId("ritual-card")).toHaveCount(0);
  await page.goto("/ritual");
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  expect(callsTo(api, "GET /v1/ritual/today")).toHaveLength(0);
});
