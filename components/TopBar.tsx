"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Menu, Bell, Coins } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import ThemeSwitch from "@/components/ThemeSwitch";
import LanguagePicker from "@/components/LanguagePicker";
import NotificationsSheet from "@/components/NotificationsSheet";
import AppMenuDrawer from "@/components/AppMenuDrawer";
import { useAuth } from "@/providers/auth-provider";

export default function TopBar({ rightContent }: { rightContent?: React.ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center px-5 pt-8 pb-4 relative z-10 w-full max-w-lg mx-auto">
        <IconButton aria-label={t("menu.title")} onClick={() => setMenuOpen(true)}>
          <Menu size={20} />
        </IconButton>
        <div className="flex items-center gap-2">
          {rightContent}
          <LanguagePicker />
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
      <NotificationsSheet open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <AppMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
