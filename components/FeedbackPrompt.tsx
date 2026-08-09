"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import FeedbackSheet, { FEEDBACK_SEEN_KEY as SEEN_KEY } from "@/components/FeedbackSheet";

const OPENS_KEY = "aroha:appOpens";
const OPENS_BEFORE_ASKING = 3;

/**
 * Opens the rating sheet once, on the user's 3rd app open — deliberately a
 * different moment from the Play review card (lib/app-review.ts), which fires
 * on purchases/reports/long chats, so the two overlays never stack. Gated on
 * the permissions prompt resolving for the same reason ShareAppPrompt is.
 *
 * Never fires for someone who already rated: FeedbackSheet stamps SEEN_KEY on a
 * successful submit, including the Settings entry point.
 */
export default function FeedbackPrompt() {
  const { user } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!permissionsResolved || !user?.profileCompletedAt) return;
    // Server-side truth first: localStorage forgets on reinstall or a new phone,
    // this doesn't.
    if (user.feedbackGiven) return;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
      const opens = Number(window.localStorage.getItem(OPENS_KEY) ?? 0) + 1;
      window.localStorage.setItem(OPENS_KEY, String(opens));
      if (opens >= OPENS_BEFORE_ASKING) {
        // Marked as seen on show, not on submit: a dismissed sheet must not
        // come back on every subsequent open.
        window.localStorage.setItem(SEEN_KEY, "1");
        setOpen(true);
      }
    } catch {
      // localStorage unavailable — skip rather than nag every open.
    }
  }, [permissionsResolved, user?.profileCompletedAt, user?.feedbackGiven]);

  if (!open) return null;
  return <FeedbackSheet onClose={() => setOpen(false)} />;
}
