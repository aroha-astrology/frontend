/**
 * The one rule for "this route shows the customer navigation" (TopBar, bottom
 * tab bar, desktop side rail). Structurally incompatible routes are excluded:
 *   - exact: pre-auth (sign-in/sign-up) and the onboarding wizard — no
 *     completed user session/profile exists yet for wallet/notifications
 *     to reflect.
 *   - prefix: /legal (public, reachable pre-auth per AuthGuard's
 *     PUBLIC_PATHS) and /admin (a separate internal-tool experience with
 *     its own layout, never shown to a customer session).
 */
const HIDDEN_EXACT_ROUTES = ["/sign-in", "/sign-up", "/onboarding"];
const HIDDEN_PREFIXES = ["/legal", "/admin"];

export function hasAppChrome(pathname: string): boolean {
  return !HIDDEN_EXACT_ROUTES.includes(pathname) && !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
