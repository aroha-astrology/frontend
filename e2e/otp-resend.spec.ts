import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { skipLaunchOverlays } from "./fixtures/auth";

const EMULATOR_CODES = "http://127.0.0.1:9099/emulator/v1/projects/demo-aroha/verificationCodes";
const PHONE = "9876501234";

/**
 * Stands in for Google's reCAPTCHA script, which cannot run against the Auth
 * emulator. It keeps the one rule that matters here, measured on the real
 * script: an element that has held a widget can never hold another, even after
 * it is emptied. Firebase uses a `grecaptcha` already on the page as-is.
 */
async function stubRecaptcha(page: Page) {
  await page.addInitScript(() => {
    const used = new WeakSet<Element>();
    const widgets: { callback: (token: string) => void }[] = [];
    (window as unknown as { grecaptcha: unknown }).grecaptcha = {
      ready: (cb: () => void) => cb(),
      render(target: Element | string, params: { callback: (token: string) => void }) {
        const el = typeof target === "string" ? document.getElementById(target)! : target;
        if (used.has(el)) throw new Error("reCAPTCHA has already been rendered in this element");
        used.add(el);
        widgets.push(params);
        return widgets.length - 1;
      },
      execute: (id: number) => setTimeout(() => widgets[id].callback("e2e-recaptcha-token"), 0),
      getResponse: () => "",
      reset: () => undefined,
    };
  });
}

/**
 * Opens /sign-in with Firebase's emulator-only mock reCAPTCHA switched off, so
 * the phone form goes through `grecaptcha` on the page as it does in production.
 */
async function openSignIn(page: Page) {
  await page.goto("/sign-in");
  await page.waitForFunction(() => Boolean((window as unknown as { __arohaE2E?: unknown }).__arohaE2E));
  await page.evaluate(() =>
    (window as unknown as { __arohaE2E: { usePageRecaptcha(): void } }).__arohaE2E.usePageRecaptcha(),
  );
}

/** Every OTP the emulator has "sent" to the test number, oldest first. */
async function sentCodes(page: Page): Promise<string[]> {
  const res = await page.request.get(EMULATOR_CODES);
  const body = (await res.json()) as { verificationCodes?: { phoneNumber: string; code: string }[] };
  return (body.verificationCodes ?? []).filter((c) => c.phoneNumber === `+91${PHONE}`).map((c) => c.code);
}

async function typeOtp(page: Page, code: string) {
  const boxes = page.locator('input[maxlength="1"]');
  for (let i = 0; i < 6; i++) await boxes.nth(i).fill(code[i]);
}

test.describe("Phone OTP", () => {
  test.beforeEach(async ({ page }) => {
    await skipLaunchOverlays(page);
    await stubRecaptcha(page);
    await mockApi(page);
  });

  test("Resend sends a second OTP, and that OTP signs the person in", async ({ page }) => {
    const before = (await sentCodes(page)).length;

    await openSignIn(page);
    await page.locator('input[type="tel"]').fill(PHONE);
    await page.getByRole("button", { name: /Send OTP/ }).click();
    await expect(page.getByRole("button", { name: /Resend/ })).toBeVisible();
    await expect.poll(async () => (await sentCodes(page)).length).toBe(before + 1);

    await page.getByRole("button", { name: /Resend/ }).click();
    await expect.poll(async () => (await sentCodes(page)).length).toBe(before + 2);
    await expect(page.locator("p.text-red-400")).toHaveCount(0);

    const codes = await sentCodes(page);
    await typeOtp(page, codes[codes.length - 1]);
    await page.getByRole("button", { name: /Verify/ }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  });

  test("Change number, then Send OTP again, still sends an OTP", async ({ page }) => {
    const before = (await sentCodes(page)).length;

    await openSignIn(page);
    await page.locator('input[type="tel"]').fill(PHONE);
    await page.getByRole("button", { name: /Send OTP/ }).click();
    await expect(page.getByRole("button", { name: /Resend/ })).toBeVisible();

    await page.getByRole("button", { name: /Change number/ }).click();
    await page.getByRole("button", { name: /Send OTP/ }).click();
    await expect(page.getByRole("button", { name: /Resend/ })).toBeVisible();
    await expect(page.locator("p.text-red-400")).toHaveCount(0);
    await expect.poll(async () => (await sentCodes(page)).length).toBe(before + 2);
  });
});
