"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Gift } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import ShareOptionsSheet from "@/components/ShareOptionsSheet";

const SEEN_KEY = "aroha:sharePromptSeen:v1";

/**
 * One-time "share the app & earn ₹100" prompt, shown once per user the next
 * time they open the app (any platform — unlike PermissionsPrompt, this
 * isn't native-only). Gated on the permissions prompt having resolved so the
 * two first-launch overlays don't stack.
 */
export default function ShareAppPrompt() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(SEEN_KEY)) return;
    if (!permissionsResolved) return;
    if (user?.profileCompletedAt && user?.referralCode) setVisible(true);
  }, [permissionsResolved, user?.profileCompletedAt, user?.referralCode]);

  const dismiss = () => {
    window.localStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
  };

  // Hardware back press counts as "not now", same as PermissionsPrompt.
  useDismissOnBackPress(visible, dismiss);

  const handleShare = () => {
    setSheetOpen(true);
    dismiss();
  };

  return (
    <>
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26 }}
            className="w-full max-w-sm rounded-3xl border border-gold/20 bg-card p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-gold mt-0.5">
                <Gift size={22} />
              </span>
              <div>
                <h2 className="text-lg font-display text-foreground mb-1">
                  {t("sharePrompt.title")}
                </h2>
                <p className="text-sm text-muted leading-relaxed">{t("sharePrompt.body")}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity"
              >
                {t("sharePrompt.notNow")}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity"
              >
                {t("sharePrompt.cta")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    {user?.referralCode && (
      <ShareOptionsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} code={user.referralCode} />
    )}
    </>
  );
}
