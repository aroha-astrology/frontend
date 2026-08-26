"use client";

import { useEffect, useState } from "react";
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
  const { user } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Need permissions to resolve first so modals don't stack
    if (!permissionsResolved || !user?.profileCompletedAt) return;
    
    // Check if we've already shown this modal
    if (typeof window !== "undefined" && window.localStorage.getItem(WELCOME_SHOWN_KEY)) {
      return;
    }

    // Only show to users who completed their profile in the last 5 minutes (brand new)
    const profileAgeMs = Date.now() - new Date(user.profileCompletedAt).getTime();
    if (profileAgeMs < 5 * 60 * 1000) {
      setVisible(true);
    } else {
      // Old user who never saw it (e.g. from before this feature) shouldn't see it now.
      window.localStorage.setItem(WELCOME_SHOWN_KEY, "1");
    }
  }, [permissionsResolved, user]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(WELCOME_SHOWN_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
    onDismiss?.();
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
