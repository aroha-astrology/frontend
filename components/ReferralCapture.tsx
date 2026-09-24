"use client";

import { useEffect } from "react";
import { capturePendingReferralCode, capturePendingUtmSource } from "@/lib/referral";
import { captureInstallReferrer } from "@/lib/install-referrer";

/**
 * Mounted once at the root so a `?ref=CODE` link or `?utm_source=` link is
 * captured before any redirect strips it — and, in the Android app, the Play
 * install referrer from a shared referral link (URL values win if both exist).
 */
export default function ReferralCapture() {
  useEffect(() => {
    capturePendingReferralCode();
    capturePendingUtmSource();
    void captureInstallReferrer();
  }, []);
  return null;
}
