"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { PartyPopper } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";

const WELCOME_SHOWN_KEY = "aroha:welcomeShown";

/**
 * A one-time welcome modal shown to brand-new users immediately after they finish
 * onboarding and land on the home screen. It takes priority over the app tour.
 */
export default function NewUserWelcomeModal({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  
  const [visible, setVisible] = useState(false);
  /** Set once this modal has decided whether to show, so the decision (and the caller's
   * `onDismiss` gate) fires exactly once per mount. */
  const [decided, setDecided] = useState(false);

  // Callers pass an inline arrow; keeping it in a ref keeps it out of the effect's deps.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    // Wait for permissions AND auth to resolve before deciding anything — `user` is null on the
    // first render of every session, and deciding from that transient state would either skip
    // the modal for a genuinely new user or release the caller's gate too early.
    if (!permissionsResolved || loading) return;
    if (decided) return;

    // Every path below is a final decision, so each one must call `settle` — the caller gates
    // the app tour on this callback (app/page.tsx), and a path that returns without settling
    // leaves the tour permanently unreachable for everyone this modal never shows to.
    const settle = () => {
      setDecided(true);
      onDismissRef.current?.();
    };

    if (!user?.profileCompletedAt) return settle();

    try {
      if (window.localStorage.getItem(WELCOME_SHOWN_KEY)) return settle();
    } catch {
      // localStorage unavailable (private mode) — fall through and treat as not-yet-shown.
    }

    // Only show to users who completed their profile in the last 5 minutes (brand new).
    const profileAgeMs = Date.now() - new Date(user.profileCompletedAt).getTime();
    if (profileAgeMs >= 5 * 60 * 1000) {
      // Old user who never saw it (e.g. from before this feature) shouldn't see it now.
      try {
        window.localStorage.setItem(WELCOME_SHOWN_KEY, "1");
      } catch {
        // ignore
      }
      return settle();
    }

    setDecided(true);
    setVisible(true);
  }, [permissionsResolved, loading, user, decided]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(WELCOME_SHOWN_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
    onDismissRef.current?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[205] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 26 }}
            className="w-full max-w-sm bg-card border border-gold/30 rounded-3xl p-6 text-center shadow-2xl overflow-hidden relative"
          >
            {/* Confetti / background flair */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-pink-500/10 pointer-events-none" />
            
            <div className="mx-auto w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-4 text-gold border border-gold/40">
              <PartyPopper size={32} />
            </div>
            
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              {t("rewards.welcomeTitle", "Welcome to Aroha! 🎉")}
            </h2>
            
            <p className="text-sm text-foreground/80 leading-relaxed mb-6">
              {t(
                "rewards.welcomeBody",
                "Your cosmic journey begins now. We've unlocked your first daily reward to get you started!"
              )}
            </p>
            
            <button
              onClick={dismiss}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold active:scale-[0.98] transition-transform"
            >
              {t("rewards.welcomeButton", "Start Exploring")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
