import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/** The light/dark toggle lives in the profile menu, beside the name, not in the top bar. */

test("the theme toggle sits in the profile menu, not the top bar", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page);
  await signIn(page, "/");

  await expect(page.getByTestId("topbar-row")).toBeVisible();
  await expect(page.getByRole("button", { name: "Toggle theme" })).toHaveCount(0);

  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  const toggle = menu.getByRole("button", { name: "Toggle theme" });
  await expect(toggle).toBeVisible();

  // To the right of the name, inside the drawer.
  const name = (await menu.getByText("Asha", { exact: true }).first().boundingBox())!;
  const tb = (await toggle.boundingBox())!;
  expect(tb.x).toBeGreaterThan(name.x + name.width - 1);

  const html = page.locator("html");
  const before = await html.getAttribute("class");
  await toggle.click();
  await expect.poll(() => html.getAttribute("class")).not.toBe(before);
});
