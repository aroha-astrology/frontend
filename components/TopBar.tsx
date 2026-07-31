"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Menu, Bell } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import ThemeSwitch from "@/components/ThemeSwitch";
import NotificationsSheet from "@/components/NotificationsSheet";
import AppMenuDrawer from "@/components/AppMenuDrawer";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useTopBarContext } from "@/providers/topbar-provider";
import WalletBalance from "@/components/ui/WalletBalance";

/**
 * Opt-OUT model, not opt-in: every route gets this shared header by default
 * (menu/wallet/notifications), so a newly-added page needs no changes here
 * to pick it up automatically — this replaced an allowlist that silently
 * left new pages (reports, ai-chat) without any nav bar until someone
 * remembered to add them. Pages that already build their own back-button
 * header (profile, settings, payment, reports/[id], etc.) still get this
 * bar too, stacked above their own header row — the same pattern already
 * established for ai-chat and reports/[id]. Only routes that are
 * structurally incompatible are excluded below:
 *   - exact: pre-auth (sign-in/sign-up) and the onboarding wizard — no
 *     completed user session/profile exists yet for wallet/notifications
 *     to reflect.
 *   - prefix: /legal (public, reachable pre-auth per AuthGuard's
 *     PUBLIC_PATHS) and /admin (a separate internal-tool experience with
 *     its own layout, never shown to a customer session).
 * Each visible route opts into a right-side slot via `useTopBarRightContent`.
 */
const HIDDEN_TOPBAR_EXACT_ROUTES = ["/sign-in", "/sign-up", "/onboarding"];
const HIDDEN_TOPBAR_PREFIXES = ["/legal", "/admin"];

/**
 * Rendered once in the root layout (like BottomNavigation) rather than per
 * page, so it stays mounted — with its own state (open menu/notifications)
 * intact — across tab navigation instead of unmounting/remounting inside
 * PageTransition's animated container. That keeps it visible during route
 * loading instead of vanishing into a full-screen loading.tsx spinner.
 */
export default function TopBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathname = usePathname();
  const { rightContent } = useTopBarContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // One fetch on mount to know whether to show the unread dot (e.g. a "your report is ready"
  // notification that arrived while the app was closed) — NotificationsSheet marks everything
  // read as soon as it's opened, so the dot is cleared optimistically below rather than by
  // re-fetching. No polling: the dot is a "something happened since you last checked" signal,
  // not a live counter.
  useEffect(() => {
    if (!user) return;
    api
      .getNotifications()
      .then((data) => setHasUnread(data.some((n) => !n.readAt)))
      .catch(() => {});
  }, [user]);

  const hidden =
    HIDDEN_TOPBAR_EXACT_ROUTES.includes(pathname) ||
    HIDDEN_TOPBAR_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (hidden) return null;

  return (
    <>
      <div className="sticky top-0 z-20 w-full bg-background/90 backdrop-blur-xl">
        <div className="flex justify-between items-center px-5 pt-8 pb-4 relative w-full max-w-lg mx-auto">
          <IconButton aria-label={t("menu.title")} onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </IconButton>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            {user && (
              <Link
                href="/payment"
                className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-gold/10 border border-gold/25 text-gold text-sm font-semibold shrink-0"
              >
                <WalletBalance paise={user.walletBalancePaise} />
              </Link>
            )}
            <IconButton
              aria-label="Notifications"
              onClick={() => {
                setNotificationsOpen(true);
                setHasUnread(false);
              }}
              className="relative"
            >
              <Bell size={20} />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </IconButton>
          </div>
        </div>
        {rightContent && (
          <div className="w-full max-w-lg mx-auto px-5 pb-2 relative">{rightContent}</div>
        )}
      </div>
      <NotificationsSheet open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <AppMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
