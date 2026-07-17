"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics-consent";

/**
 * Minimal, non-blocking banner gating PostHog init/identify/capture until the
 * user explicitly opts in — the app remains fully usable either way. See
 * providers/posthog-provider.tsx (init only fires after "granted") and
 * lib/analytics-consent.ts.
 */
export default function AnalyticsConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getAnalyticsConsent() === "unset");
  }, []);

  if (!visible) return null;

  const choose = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[90] mx-auto max-w-md rounded-2xl border border-gold/20 bg-card/95 backdrop-blur-xl shadow-2xl px-4 py-3.5">
      <p className="text-xs text-muted leading-relaxed mb-3">{t("analyticsConsent.body")}</p>
      <div className="flex gap-2.5">
        <button
          onClick={() => choose("denied")}
          className="flex-1 px-3 py-2 rounded-xl border border-gold/20 text-xs font-medium text-foreground"
        >
          {t("analyticsConsent.decline")}
        </button>
        <button
          onClick={() => choose("granted")}
          className="flex-1 px-3 py-2 rounded-xl bg-gold text-[#1a0e00] text-xs font-medium"
        >
          {t("analyticsConsent.accept")}
        </button>
      </div>
    </div>
  );
}
