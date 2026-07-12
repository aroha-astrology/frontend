"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Menu, Bell, Coins } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import ThemeSwitch from "@/components/ThemeSwitch";
import LanguagePicker from "@/components/LanguagePicker";
import NotificationsSheet from "@/components/NotificationsSheet";
import AppMenuDrawer from "@/components/AppMenuDrawer";
import { useAuth } from "@/providers/auth-provider";
import { useTopBarContext } from "@/providers/topbar-provider";

/** The 4 tab routes that use this shared header — kundli/home/horoscope/panchang
 * each opt into a right-side slot via `useTopBarRightContent`; every other
 * route (ai-chat, profile, settings, onboarding, etc.) has its own header. */
const TOPBAR_ROUTES = ["/", "/kundli", "/horoscope", "/panchang"];

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

  if (!TOPBAR_ROUTES.includes(pathname)) return null;

  return (
    <>
      <div className="flex justify-between items-center px-5 pt-8 pb-4 relative z-10 w-full max-w-lg mx-auto">
        <IconButton aria-label={t("menu.title")} onClick={() => setMenuOpen(true)}>
          <Menu size={20} />
        </IconButton>
        <div className="flex items-center gap-2">
          <LanguagePicker align="left" />
          <ThemeSwitch />
          {user && (
            <Link
              href="/payment"
              className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-gold/10 border border-gold/25 text-gold text-sm font-semibold shrink-0"
            >
              <Coins size={15} />
              {user.credits}
            </Link>
          )}
          <IconButton aria-label="Notifications" onClick={() => setNotificationsOpen(true)}>
            <Bell size={20} />
          </IconButton>
        </div>
      </div>
      {rightContent && (
        <div className="w-full max-w-lg mx-auto px-5 pb-2 relative z-10">{rightContent}</div>
      )}
      <NotificationsSheet open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <AppMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
