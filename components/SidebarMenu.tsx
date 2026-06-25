"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, User, Settings, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

interface SidebarMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function SidebarMenu({ open, onClose }: SidebarMenuProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    onClose();
    await signOut();
    router.push("/sign-in");
  };

  const menuItems = [
    {
      icon: <User size={20} />,
      label: t("menu.profile"),
      onClick: () => {
        onClose();
        router.push("/onboarding");
      },
    },
    {
      icon: <Settings size={20} />,
      label: t("menu.settings"),
      onClick: () => {
        onClose();
      },
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-[95] w-72 bg-card border-r border-gold/20 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-8 pb-4 border-b border-gold/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center text-gold">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-display text-foreground truncate">
                    {user?.displayName ?? t("menu.guest")}
                  </p>
                  {user?.phoneE164 && (
                    <p className="text-xs text-muted truncate">{user.phoneE164}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Menu items */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foreground hover:bg-gold/5 transition-colors"
                >
                  <span className="text-gold">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Logout */}
            <div className="px-3 pb-8 border-t border-gold/10 pt-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={20} />
                {t("menu.logout")}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
