"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BellOff, X } from "lucide-react";

/**
 * Bottom sheet opened from the home top-bar bell icon. There's no
 * notifications backend yet, so this always shows the empty state — but the
 * button is wired up rather than doing nothing on tap.
 */
export default function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-gold/20 rounded-t-3xl shadow-2xl px-5 pt-4 pb-10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold font-display text-foreground">{t("notifications.title")}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <BellOff size={32} className="text-gold/40" />
              <p className="text-sm text-muted max-w-xs">{t("notifications.empty")}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
