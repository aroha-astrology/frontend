import type { Page } from "@playwright/test";

/**
 * Hides the once-per-session / once-ever overlays that would otherwise sit on
 * top of the screen under test. Runs before any app script on every page load.
 * Pass `welcome: true` to leave the new-user welcome modal eligible.
 */
export async function skipLaunchOverlays(page: Page, opts: { welcome?: boolean } = {}) {
  await page.addInitScript((showWelcome) => {
    try {
      window.sessionStorage.setItem("aroha_splash_shown", "1");
      if (!showWelcome) window.localStorage.setItem("aroha:welcomeShown", "1");
    } catch {
      // storage unavailable — overlays just show
    }
  }, Boolean(opts.welcome));
}

/**
 * Signs the browser in through the Firebase Auth emulator (lib/firebase.ts
 * exposes window.__arohaE2E only in an emulator build), then opens `path`.
 * The session lives in IndexedDB, so it survives the navigation.
 */
export async function signIn(page: Page, path = "/", uid = "e2e-user") {
  // A public page, so AuthGuard doesn't bounce us before the hook exists.
  await page.goto("/legal/terms");
  await page.waitForFunction(() => Boolean((window as unknown as { __arohaE2E?: unknown }).__arohaE2E), null, {
    timeout: 30_000,
  });
  await page.evaluate(
    (id) => (window as unknown as { __arohaE2E: { signIn(uid: string): Promise<void> } }).__arohaE2E.signIn(id),
    uid,
  );
  await page.goto(path);
}
