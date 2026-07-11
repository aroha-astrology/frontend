"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { User, Settings, LogOut, X, ChevronRight, ScrollText, ShieldCheck } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";

/**
 * Slide-in side panel triggered by the top-left hamburger.
 * Shows the signed-in user, profile/settings links, and a sign-out action.
 */
export default function AppMenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Close on hardware back press instead of exiting the app/navigating away.
  useDismissOnBackPress(open, onClose);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      onClose();
      router.replace("/sign-in");
    }
  };

  const initial = (user?.displayName ?? user?.phoneE164 ?? "?").trim().charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            aria-hidden
          />

          {/* Panel */}
          <motion.aside
            role="dialog"
            aria-label={t("menu.title")}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 bottom-0 z-[70] w-[84%] max-w-[340px] bg-card border-r border-gold/20 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-6 pb-5 border-b border-gold/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/80 to-purple-600/60 flex items-center justify-center text-[#1a0e00] font-display text-lg shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="text-foreground font-medium text-[15px] truncate">
                    {user?.displayName ?? t("menu.guest")}
                  </div>
                  {user?.phoneE164 && (
                    <div className="text-muted text-[12px] truncate">{user.phoneE164}</div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={t("common.close")}
                className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-gold/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
              <DrawerLink
                href="/profile"
                icon={<User size={16} />}
                label={t("menu.profile")}
                onClick={onClose}
              />
              <DrawerLink
                href="/settings"
                icon={<Settings size={16} />}
                label={t("menu.settings")}
                onClick={onClose}
              />
              <DrawerLink
                href="/legal/terms"
                icon={<ScrollText size={16} />}
                label={t("legal.terms")}
                onClick={onClose}
              />
              <DrawerLink
                href="/legal/privacy"
                icon={<ShieldCheck size={16} />}
                label={t("legal.privacy")}
                onClick={onClose}
              />
            </nav>

            {/* Footer / Sign out */}
            <div className="px-3 pb-7 pt-2 border-t border-gold/10">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                <span className="text-[14px] font-medium">{t("menu.signOut")}</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-xl text-foreground hover:bg-gold/10 transition-colors group"
    >
      <span className="text-gold">{icon}</span>
      <span className="flex-1 text-[14px]">{label}</span>
      <ChevronRight size={14} className="text-muted group-hover:text-gold transition-colors" />
    </Link>
  );
}
