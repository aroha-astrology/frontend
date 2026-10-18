import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { ExperienceInfo, ExperienceSkin } from "../lib/experience";

// Choosing the look (switch experience.picker): every user picks once during onboarding, an existing
// user is asked once on Home, and Settings → "Switch experience" changes it later: one free change,
// then once every 30 days (the server decides; these tests stand in for it).

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const DAY = 24 * 60 * 60 * 1000;

const info = (over: Partial<ExperienceInfo> = {}): ExperienceInfo => ({
  enabled: true,
  skin: null,
  picked: false,
  freeChangeLeft: true,
  canChange: true,
  nextAllowedAt: null,
  ...over,
});

/** A stand-in for the backend rule: first pick free, one free change, then 30 days. */
function experienceServer(start: ExperienceInfo) {
  let state = start;
  let changedAt: number | null = null;
  const handlers: Handlers = {
    "GET /v1/me/experience": () => ({ json: state }),
    "PUT /v1/me/experience": (c) => {
      const skin = (c.body as { skin: ExperienceSkin }).skin;
      if (state.skin === null) {
        state = { ...state, skin, picked: true };
      } else if (state.skin !== skin) {
        if (!state.canChange) {
          return {
            status: 409,
            json: {
              error: {
                code: "CONFLICT",
                message: "You can switch your experience again later",
                details: { reason: "EXPERIENCE_COOLDOWN", nextAllowedAt: state.nextAllowedAt },
              },
            },
          };
        }
        changedAt = Date.now();
        state = {
          ...state,
          skin,
          freeChangeLeft: false,
          canChange: false,
          nextAllowedAt: new Date(changedAt + 30 * DAY).toISOString(),
        };
      }
      return { json: state };
    },
  };
  return { handlers, state: () => state };
}

const NEW_USER = { profileCompletedAt: null, dateOfBirth: null, timeOfBirth: null, placeOfBirth: null, displayName: null };

test.describe("Experience picker", () => {
  test("onboarding asks everyone after the language, and saves the pick", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = experienceServer(info());
    const api = await mockApi(page, {
      user: { ...NEW_USER, features: { "experience.picker": ON } },
      overrides: server.handlers,
    });
    await signIn(page, "/onboarding");

    await page.getByRole("button", { name: /English/ }).click();
    const cards = page.getByTestId("experience-cards");
    await expect(cards).toBeVisible();
    await expect(page.getByTestId("experience-card-CLASSIC_VEDIC")).toContainText("Classic Vedic");
    await expect(page.getByTestId("experience-card-MODERN_COSMIC")).toContainText("Modern Cosmic");
    // English suggests Classic, but nothing is chosen until the user taps.
    await expect(page.getByTestId("experience-card-CLASSIC_VEDIC")).toContainText("Suggested for you");
    expect(callsTo(api, "PUT /v1/me/experience")).toHaveLength(0);

    await page.getByTestId("experience-card-MODERN_COSMIC").click();
    await expect.poll(() => callsTo(api, "PUT /v1/me/experience").length).toBe(1);
    expect(callsTo(api, "PUT /v1/me/experience")[0]!.body).toEqual({ skin: "MODERN_COSMIC" });
    // The flow goes on to the name question.
    await expect(cards).toHaveCount(0);
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test("with the switch off, onboarding goes straight from language to name", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: NEW_USER, overrides: experienceServer(info()).handlers });
    await signIn(page, "/onboarding");

    await page.getByRole("button", { name: /English/ }).click();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.getByTestId("experience-cards")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/me/experience")).toHaveLength(0);
  });

  test("an existing user who has not picked is asked once on Home", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = experienceServer(info());
    const api = await mockApi(page, { user: { features: { "experience.picker": ON } }, overrides: server.handlers });
    await signIn(page, "/");

    const gate = page.getByTestId("experience-gate");
    await expect(gate).toBeVisible();
    await page.getByTestId("experience-card-CLASSIC_VEDIC").click();
    await expect(gate).toHaveCount(0);
    expect(callsTo(api, "PUT /v1/me/experience")[0]!.body).toEqual({ skin: "CLASSIC_VEDIC" });
  });

  test("someone who has picked is never asked again", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = experienceServer(info({ skin: "CLASSIC_VEDIC", picked: true }));
    await mockApi(page, { user: { features: { "experience.picker": ON } }, overrides: server.handlers });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByTestId("experience-gate")).toHaveCount(0);
  });
});

test.describe("Settings → Switch experience", () => {
  const picked = (over: Partial<ExperienceInfo> = {}) =>
    experienceServer(info({ skin: "CLASSIC_VEDIC", picked: true, ...over }));

  test("the one free change goes through at once, then the row shows the wait", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await skipLaunchOverlays(page);
    const server = picked();
    const api = await mockApi(page, { user: { features: { "experience.picker": ON } }, overrides: server.handlers });
    await signIn(page, "/settings");

    const row = page.getByTestId("switch-experience");
    await expect(row).toContainText("Switch experience");
    await expect(row).toContainText("1 free change left");

    await row.getByRole("button").click();
    await page.getByTestId("experience-card-MODERN_COSMIC").click();
    await expect(page.getByText("This is your one free change")).toBeVisible();
    await page.getByTestId("switch-experience-confirm").click();

    await expect(page.getByTestId("switch-experience-message")).toHaveText("Your experience is now Modern Cosmic.");
    expect(callsTo(api, "PUT /v1/me/experience")[0]!.body).toEqual({ skin: "MODERN_COSMIC" });
    // The next change is 30 days away: the row says when, and no longer opens.
    await expect(row).toContainText("Available on");
    await expect(row.getByRole("button")).toHaveCount(0);
  });

  test("inside the 30 days the row is closed and says when it opens", async ({ page }) => {
    await skipLaunchOverlays(page);
    const next = new Date(Date.now() + 12 * DAY);
    const server = picked({
      skin: "MODERN_COSMIC",
      freeChangeLeft: false,
      canChange: false,
      nextAllowedAt: next.toISOString(),
    });
    await mockApi(page, { user: { features: { "experience.picker": ON } }, overrides: server.handlers });
    await signIn(page, "/settings");

    const row = page.getByTestId("switch-experience");
    await expect(row).toContainText("Available on");
    await expect(row.getByRole("button")).toHaveCount(0);
  });

  test("after the 30 days it can be switched again, and the confirm warns about the next wait", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = picked({ skin: "MODERN_COSMIC", freeChangeLeft: false, canChange: true });
    await mockApi(page, { user: { features: { "experience.picker": ON } }, overrides: server.handlers });
    await signIn(page, "/settings");

    const row = page.getByTestId("switch-experience");
    await row.getByRole("button").click();
    await page.getByTestId("experience-card-CLASSIC_VEDIC").click();
    await expect(page.getByText("After this, you can switch again in 30 days.")).toBeVisible();
  });

  test("a second device that already used the change gets the server's date, not a silent failure", async ({ page }) => {
    await skipLaunchOverlays(page);
    const next = new Date(Date.now() + 20 * DAY);
    // The screen still thinks a change is open; the server says otherwise.
    let served = info({ skin: "CLASSIC_VEDIC", picked: true });
    const handlers: Handlers = {
      "GET /v1/me/experience": () => ({ json: served }),
      "PUT /v1/me/experience": () => {
        served = info({ skin: "CLASSIC_VEDIC", picked: true, freeChangeLeft: false, canChange: false, nextAllowedAt: next.toISOString() });
        return {
          status: 409,
          json: {
            error: {
              code: "CONFLICT",
              message: "You can switch your experience again later",
              details: { reason: "EXPERIENCE_COOLDOWN", nextAllowedAt: next.toISOString() },
            },
          },
        };
      },
    };
    await mockApi(page, { user: { features: { "experience.picker": ON } }, overrides: handlers });
    await signIn(page, "/settings");

    const row = page.getByTestId("switch-experience");
    await row.getByRole("button").click();
    await page.getByTestId("experience-card-MODERN_COSMIC").click();
    await page.getByTestId("switch-experience-confirm").click();

    await expect(page.getByTestId("switch-experience-message")).toContainText("You can switch again on");
    await expect(row).toContainText("Available on");
  });

  test("with the switch off the row is not there", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { overrides: picked().handlers });
    await signIn(page, "/settings");
    await expect(page.getByText("Preferences")).toBeVisible();
    await expect(page.getByTestId("switch-experience")).toHaveCount(0);
  });
});
