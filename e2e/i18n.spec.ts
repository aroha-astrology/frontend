import { test, expect } from "@playwright/test";

test("switching to Hindi translates the sign-in screen", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /Send OTP/ })).toBeVisible();
  await page.getByRole("button", { name: "Select language" }).first().click();
  await page.getByText("हिन्दी").click();
  await expect(page.getByRole("button", { name: /OTP भेजें/ })).toBeVisible();
});
