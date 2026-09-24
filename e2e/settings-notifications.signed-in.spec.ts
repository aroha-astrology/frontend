import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

test.describe("Settings → Notifications", () => {
  test("turning off a category saves the merged prefs", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { notificationPrefs: { transitAlerts: { push: true } } } });
    await signIn(page, "/settings");

    const offers = page.getByRole("switch", { name: "Offers & rewards" });
    await expect(offers).toHaveAttribute("aria-checked", "true");
    await offers.click();

    await expect.poll(() => callsTo(api, "PATCH /v1/me").length).toBe(1);
    expect(callsTo(api, "PATCH /v1/me")[0]!.body).toEqual({
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

    await expect.poll(() => callsTo(api, "PATCH /v1/me").length).toBe(1);
    expect(callsTo(api, "PATCH /v1/me")[0]!.body).toEqual({
      notificationPrefs: { dailyHoroscope: { push: false } },
    });
  });

  test("quiet hours toggle on to 22:00–07:00 and off to null", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/settings");

    const quiet = page.getByRole("switch", { name: /Quiet hours/ });
    await quiet.click();
    await expect.poll(() => callsTo(api, "PATCH /v1/me").length).toBe(1);
    expect(callsTo(api, "PATCH /v1/me")[0]!.body).toEqual({ quietHours: { start: "22:00", end: "07:00" } });

    await expect(quiet).toBeEnabled();
    await quiet.click();
    await expect.poll(() => callsTo(api, "PATCH /v1/me").length).toBe(2);
    expect(callsTo(api, "PATCH /v1/me")[1]!.body).toEqual({ quietHours: null });
  });
});
