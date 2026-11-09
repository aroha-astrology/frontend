"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { usePopupSlot } from "@/providers/popup-slot-provider";
import { useTour } from "@/providers/tour-provider";
import FeedbackSheet, { FEEDBACK_SEEN_KEY as SEEN_KEY } from "@/components/FeedbackSheet";
import { appOpensThisLaunch, rateUsDue } from "@/lib/app-opens";

/**
 * Opens the rating sheet exactly once, ever: from the user's 3rd app open (owner, 2026-11-09; before this it fired
 * after 3 chat answers or a few minutes after a report). It takes the lowest slot in lib/popup-slot.ts, so if
 * anything else opened during this app open it simply waits for the next visit. Never on a report page, never
 * while a tour is running.
 *
 * Never fires for someone who already rated: FeedbackSheet stamps SEEN_KEY on a successful submit, including the
 * Settings entry point.
 */
export default function FeedbackPrompt() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const { tourActive, tourPending } = useTour();
  const { canOpen, claim } = usePopupSlot("rate-us");
  const [open, setOpen] = useState(false);

  // Count this open at once, ahead of every gate below: someone who is not eligible yet must still be
  // accumulating opens (this counter used to be kept by the Share prompt).
  useEffect(() => {
    appOpensThisLaunch();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || open) return;
    if (!permissionsResolved || !user?.profileCompletedAt) return;
    // Bail BEFORE the SEEN_KEY write below, not just before the render: this effect marks the ask as seen on
    // show, so deciding during a tour would burn the one rating prompt behind the tour's scrim.
    if (tourActive || tourPending) return;
    try {
      const due = rateUsDue({
        opens: appOpensThisLaunch(),
        // Server-side truth first (feedbackGiven): localStorage forgets on reinstall or a new phone, this does not.
        seen: window.localStorage.getItem(SEEN_KEY) !== null,
        feedbackGiven: !!user.feedbackGiven,
        // Never interrupt a report they are reading.
        onReport: !!pathname?.startsWith("/reports/"),
      });
      if (!due || !canOpen || !claim()) return;
      // Marked as seen on show, not on submit: a dismissed sheet must not come back.
      window.localStorage.setItem(SEEN_KEY, "1");
      setOpen(true);
    } catch {
      // localStorage unavailable — skip rather than nag every open.
    }
  }, [open, pathname, permissionsResolved, tourActive, tourPending, user?.profileCompletedAt, user?.feedbackGiven, canOpen, claim]);

  if (!open) return null;
  return <FeedbackSheet onClose={() => setOpen(false)} />;
}
