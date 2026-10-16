import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type MockState } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * The saves these tests are about. The app also saves the reader's language to
 * the profile once on load (components/LanguageSync.tsx, added 2026-10-05) with
 * the same PATCH /v1/me; counting every PATCH made all three tests here fail
 * from that day on.
 */
const settingsSaves = (api: MockState) =>
  callsTo(api, "PATCH /v1/me").filter((c) => !("contentLanguage" in (c.body as Record<string, unknown>)));

test.describe("Settings → Notifications", () => {
  test("turning off a category saves the merged prefs", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { notificationPrefs: { transitAlerts: { push: true } } } });
    await signIn(page, "/settings");

    const offers = page.getByRole("switch", { name: "Offers & rewards" });
    await expect(offers).toHaveAttribute("aria-checked", "true");
    await offers.click();

    await expect.poll(() => settingsSaves(api).length).toBe(1);
    expect(settingsSaves(api)[0]!.body).toEqual({
      notificationPrefs: { transitAlerts: { push: true }, marketing: { push: false } },
    });
    await expect(offers).toHaveAttribute("aria-checked", "false");
  });

  test("the daily horoscope push can be switched off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/settings");

    const daily = page.getByRole("switch", { name: "Daily horoscope" });
    await expect(daily).toHaveAttribute("aria-checked", "true");
    await daily.click();

    await expect.poll(() => settingsSaves(api).length).toBe(1);
    expect(settingsSaves(api)[0]!.body).toEqual({
      notificationPrefs: { dailyHoroscope: { push: false } },
    });
  });

  test("quiet hours toggle on to 22:00–07:00 and off to null", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/settings");

    const quiet = page.getByRole("switch", { name: /Quiet hours/ });
    await quiet.click();
    await expect.poll(() => settingsSaves(api).length).toBe(1);
    expect(settingsSaves(api)[0]!.body).toEqual({ quietHours: { start: "22:00", end: "07:00" } });

    await expect(quiet).toBeEnabled();
    await quiet.click();
    await expect.poll(() => settingsSaves(api).length).toBe(2);
    expect(settingsSaves(api)[1]!.body).toEqual({ quietHours: null });
  });
});
