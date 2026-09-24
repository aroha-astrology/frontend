import { test, expect } from "@playwright/test";

test.describe("Sign-in chrome", () => {
  test("has a working language picker", async ({ page }) => {
    await page.goto("/sign-in");
    const picker = page.getByRole("button", { name: "Select language" }).first();
    await expect(picker).toBeVisible();
  });

  test("has a theme switch that toggles the theme", async ({ page }) => {
    await page.goto("/sign-in");
    const html = page.locator("html");
    const before = await html.getAttribute("class");
    await page.getByRole("button", { name: "Toggle theme" }).first().click();
    await expect.poll(() => html.getAttribute("class")).not.toBe(before);
  });
});
