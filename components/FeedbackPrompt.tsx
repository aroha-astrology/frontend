"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useTour } from "@/providers/tour-provider";
import FeedbackSheet, { FEEDBACK_SEEN_KEY as SEEN_KEY } from "@/components/FeedbackSheet";
import { feedbackAskDue } from "@/lib/app-review";

/**
 * Opens the rating sheet exactly once, after the user has actually got value out
 * of the app: 3 real AI chat answers, or a generated report plus enough time to
 * read it (see feedbackAskDue). Re-checked on navigation, not on a timer, so the
 * ask lands when the user leaves what they were doing rather than on top of it.
 * Gated on the permissions prompt resolving for the same reason ShareAppPrompt is.
 *
 * Never fires for someone who already rated: FeedbackSheet stamps SEEN_KEY on a
 * successful submit, including the Settings entry point.
 */
export default function FeedbackPrompt() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const { tourActive, tourPending } = useTour();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!permissionsResolved || !user?.profileCompletedAt) return;
    // Bail BEFORE the SEEN_KEY write below, not just before the render: this
    // effect marks the ask as seen on show, so deciding during a tour — or in
    // the gap before tourActive itself flips true while TourHost is still
    // waiting on the tour's target — would burn the one rating prompt behind
    // the tour's scrim.
    if (tourActive || tourPending) return;
    // Server-side truth first: localStorage forgets on reinstall or a new phone,
    // this doesn't.
    if (user.feedbackGiven) return;
    // Never interrupt a report they're reading — that's the whole point of the
    // delay. They'll get asked on the way out.
    if (pathname?.startsWith("/reports/")) return;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
      if (!feedbackAskDue()) return;
      // Marked as seen on show, not on submit: a dismissed sheet must not come
      // back on every subsequent navigation.
      window.localStorage.setItem(SEEN_KEY, "1");
      setOpen(true);
    } catch {
      // localStorage unavailable — skip rather than nag every open.
    }
  }, [pathname, permissionsResolved, tourActive, tourPending, user?.profileCompletedAt, user?.feedbackGiven]);

  if (!open) return null;
  return <FeedbackSheet onClose={() => setOpen(false)} />;
}
