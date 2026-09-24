import { test, expect } from "@playwright/test";

test.describe("Signed out", () => {
  for (const path of ["/", "/kundli", "/ai-chat", "/settings"]) {
    test(`redirects ${path} to /sign-in`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL("**/sign-in");
    });
  }

  test("sign-in shows the phone form and branding", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator('input[type="tel"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Send OTP/ })).toBeVisible();
    await expect(page.getByText("AROHA").first()).toBeVisible();
  });

  test("sign-up page is reachable without signing in", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("button", { name: /Send OTP/ })).toBeVisible();
  });

  test("legal pages are readable before signing in", async ({ page }) => {
    await page.goto("/legal/terms");
    await expect(page).toHaveURL(/\/legal\/terms/);
  });
});
