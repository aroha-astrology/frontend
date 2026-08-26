"use client";

import { useEffect } from "react";
import { capturePendingReferralCode, capturePendingUtmSource } from "@/lib/referral";

/** Mounted once at the root so a `?ref=CODE` link or `?utm_source=` link is captured before any redirect strips it. */
export default function ReferralCapture() {
  useEffect(() => {
    capturePendingReferralCode();
    capturePendingUtmSource();
  }, []);
  return null;
}
