"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useTour } from "@/providers/tour-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { usePopupSlot } from "@/providers/popup-slot-provider";
import { resolveFeature, useNewFeature } from "@/hooks/useFeature";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { markLaunchSeen, shouldShowVarshikLaunch, VARSHIK_LAUNCH_ID } from "@/lib/launch-popup";

/**
 * Home's "Varshik Rashifal 2027 is here" pop-up (home.varshikLaunchPopup, ships off), with the cover art and a
 * "See your 2027" button to the reports list. Shown once to each user, and only while the report itself
 * (reports.varshik_rashifal_2027) is on too: see lib/launch-popup.ts for who counts. The server remembers it
 * (`popupsSeen`), so a reinstall or a new phone does not show it again. There is no push notification with it.
 *
 * `ready` is Home saying its splash and welcome are out of the way. It takes the Varshik slot in the one-pop-up-
 * per-open order (lib/popup-slot.ts): the festival gift and Rate us wait for a later visit.
 */
export default function ReportLaunchModal({ ready }: { ready: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { tourActive, tourPending } = useTour();
  const { enabled: popupOn } = useNewFeature("home.varshikLaunchPopup");
  const { canOpen, claim, settle } = usePopupSlot("varshik-launch");
  const [wants, setWants] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const reportOn = resolveFeature(user?.features, "reports.varshik_rashifal_2027", { failClosed: true }).enabled;

  // Decide once per mount whether this user is due the pop-up. Waiting on Home's splash, the welcome and any tour.
  useEffect(() => {
    if (wants !== null || !ready || !user || tourActive || tourPending) return;
    const due = shouldShowVarshikLaunch({
      popupOn,
      reportOn,
      user: { id: user.id, profileCompletedAt: user.profileCompletedAt, popupsSeen: user.popupsSeen },
    });
    setWants(due);
    if (!due) settle();
  }, [wants, ready, user, tourActive, tourPending, popupOn, reportOn, settle]);

  // Take the slot when it is free; otherwise wait (a higher pop-up is still deciding) or give up for this visit.
  useEffect(() => {
    if (!wants || open || done || !canOpen) return;
    if (claim()) {
      setOpen(true);
      track("varshik_launch_popup_shown");
    } else {
      setDone(true);
    }
  }, [wants, open, done, canOpen, claim]);

  const close = () => {
    if (user) {
      markLaunchSeen(VARSHIK_LAUNCH_ID, user.id);
      api.updateMe({ popupSeen: VARSHIK_LAUNCH_ID }).catch(() => {
        // Offline: the local key still stops it on this phone.
      });
    }
    setOpen(false);
    setDone(true);
  };

  const seeReport = () => {
    track("varshik_launch_popup_clicked");
    close();
    router.push("/reports");
  };

  const dismiss = () => {
    track("varshik_launch_popup_closed");
    close();
  };

  useDismissOnBackPress(open, dismiss);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          className="fixed inset-0 z-[88] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          data-testid="report-launch-modal"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("varshikLaunch.title")}
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
              onClick={dismiss}
              aria-label={t("common.close")}
              className="absolute right-3 top-3 z-10 p-1.5 text-muted hover:text-foreground"
            >
              <X size={20} />
            </button>

            <div className="relative space-y-3">
              <span className="inline-block rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                {t("varshikLaunch.badge")}
              </span>
              {/* The cover art, as printed on the report (1696 x 2528). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/varshphal/cover.webp"
                alt=""
                width={1696}
                height={2528}
                className="mx-auto h-48 w-auto rounded-lg border border-gold/40 object-cover shadow-xl"
                data-testid="report-launch-cover"
              />
              <h2 className="text-2xl font-display font-bold text-foreground">{t("varshikLaunch.title")}</h2>
              <p className="text-sm leading-relaxed text-foreground/85">{t("varshikLaunch.body")}</p>
              <button
                type="button"
                onClick={seeReport}
                data-testid="report-launch-cta"
                className="h-12 w-full rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 font-bold text-black active:scale-[0.98] transition-transform"
              >
                {t("varshikLaunch.cta")}
              </button>
              <button type="button" onClick={dismiss} className="w-full py-1 text-xs text-muted">
                {t("varshikLaunch.later")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
