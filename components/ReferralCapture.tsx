"use client";

import { useEffect } from "react";
import { capturePendingReferralCode } from "@/lib/referral";

/** Mounted once at the root so a `?ref=CODE` link is captured before any redirect strips it. */
export default function ReferralCapture() {
  useEffect(() => {
    capturePendingReferralCode();
  }, []);
  return null;
}
