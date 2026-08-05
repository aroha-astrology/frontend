"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, Sparkles } from "lucide-react";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { PLAY_STORE_URL } from "@/lib/app-review";
import { isUpdateAvailable, snoozeUpdatePrompt } from "@/lib/app-update";

/**
 * "A new version is available" modal, shown on launch to native Android users
 * running an older build than the one on Play. Gated on the permissions prompt
 * having resolved so first-launch overlays don't stack; sits above the share
 * prompt (z-90 vs z-80) on the rare launch where both want the screen.
 */
export default function UpdatePrompt() {
  const { t } = useTranslation();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!permissionsResolved) return;
    let cancelled = false;
    isUpdateAvailable().then((outdated) => {
      if (outdated && !cancelled) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [permissionsResolved]);

  const dismiss = () => {
    snoozeUpdatePrompt();
    setVisible(false);
  };

  // Hardware back press counts as "Later", same as the other launch prompts.
  useDismissOnBackPress(visible, dismiss);

  const handleUpdate = () => {
    window.open(PLAY_STORE_URL, "_blank");
    // Not snoozed: if they bounce off the Play page without updating, the
    // prompt is still true next launch.
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26 }}
            className="w-full max-w-sm rounded-3xl border border-gold/20 bg-card p-6 shadow-2xl text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400/25 to-yellow-600/10 border border-gold/30">
              <motion.span
                className="text-gold"
                initial={{ y: -3 }}
                animate={{ y: 3 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.1, ease: "easeInOut" }}
              >
                <ArrowDownToLine size={28} />
              </motion.span>
            </div>

            <h2 className="text-xl font-display text-foreground mb-2">{t("updatePrompt.title")}</h2>
            <p className="text-sm text-muted leading-relaxed mb-5">{t("updatePrompt.body")}</p>

            <button
              onClick={handleUpdate}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
            >
              <Sparkles size={16} />
              {t("updatePrompt.cta")}
            </button>
            <button
              onClick={dismiss}
              className="w-full mt-2 py-3 rounded-xl text-muted text-sm font-medium transition-opacity"
            >
              {t("updatePrompt.later")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
