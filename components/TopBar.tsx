"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Bell } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import ThemeSwitch from "@/components/ThemeSwitch";
import LanguagePicker from "@/components/LanguagePicker";
import NotificationsSheet from "@/components/NotificationsSheet";
import AppMenuDrawer from "@/components/AppMenuDrawer";

export default function TopBar({ rightContent }: { rightContent?: React.ReactNode }) {
  const { t } = useTranslation();
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
