"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Crown, X } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useTour } from "@/providers/tour-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useNewFeature } from "@/hooks/useFeature";
import { usePassStatus } from "@/hooks/usePassStatus";
import { track } from "@/lib/analytics";
import { formatRupees } from "@/lib/format";
import { markPassLaunchSeen, shouldShowPassLaunch } from "@/lib/pass-launch";

/**
 * Home's "Aroha Pass is here" popup (home.passLaunchPopup, ships off), with a
 * button to /pass. Shown once to each user who has no Pass, and only while a
 * Pass is on sale. A new user does not get it on the visit they signed up in:
 * see lib/pass-launch.ts. `ready` is Home saying its splash and welcome are out
 * of the way; a live festival gift keeps the popup slot, and the daily reward
 * sits above this one.
 */
export default function PassLaunchModal({ ready }: { ready: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { tourActive, tourPending } = useTour();
  const { enabled } = useNewFeature("home.passLaunchPopup");
  const status = usePassStatus();
  const [open, setOpen] = useState(false);
  const [decided, setDecided] = useState(false);

  const cheapest = status && !status.pass ? status.offers[0] : undefined;
  const canDecide =
    enabled && ready && !!user && !!cheapest && !user.activeClaimableCampaign && !tourActive && !tourPending;

  useEffect(() => {
    if (!canDecide || decided || !user) return;
    setDecided(true);
    if (shouldShowPassLaunch({ id: user.id, profileCompletedAt: user.profileCompletedAt })) {
      setOpen(true);
      track("pass_launch_popup_shown");
    }
  }, [canDecide, decided, user]);

  const close = () => {
    if (user) markPassLaunchSeen(user.id);
    setOpen(false);
  };

  const seeBenefits = () => {
    track("pass_launch_popup_opened_pass");
    close();
    router.push("/pass");
  };

  useDismissOnBackPress(open, close);

  return (
    <AnimatePresence>
      {open && cheapest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[88] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          data-testid="pass-launch-modal"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("pass.launch.title")}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/40 bg-card p-6 text-center shadow-2xl"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/20 via-transparent to-transparent"
              aria-hidden
            />
            <button
              type="button"
              onClick={close}
              aria-label={t("common.close")}
              className="absolute right-3 top-3 z-10 p-1.5 text-muted hover:text-foreground"
            >
              <X size={20} />
            </button>

            <div className="relative space-y-3">
              <span className="inline-block rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                {t("pass.launch.badge")}
              </span>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/20 text-gold">
                <Crown size={30} />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">{t("pass.launch.title")}</h2>
              <p className="text-sm leading-relaxed text-foreground/85">{t("pass.launch.body")}</p>
              <p className="text-sm font-semibold text-gold">
                {t(status && status.offers.length > 1 ? "pass.from" : "pass.perMonth", {
                  price: formatRupees(cheapest.pricePaise),
                })}
              </p>
              <button
                type="button"
                onClick={seeBenefits}
                data-testid="pass-launch-cta"
                className="h-12 w-full rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 font-bold text-black active:scale-[0.98] transition-transform"
              >
                {t("pass.launch.cta")}
              </button>
              <button type="button" onClick={close} className="w-full py-1 text-xs text-muted">
                {t("pass.launch.later")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
