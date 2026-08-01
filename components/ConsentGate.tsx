"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import BrandLogo from "@/components/ui/BrandLogo";
import { LEGAL_VERSION } from "@/lib/legal-content";

/**
 * Blocking gate shown for any signed-in, already-onboarded user who either
 * has no data-processing consent (e.g. anyone who completed onboarding
 * before the consent checkbox existed there) or consented to a superseded
 * version of the documents. Without this, `requireConsent` permanently 403s
 * their chat/forecast/matchmaking calls with no way to recover from within
 * the app, and a version bump would never reach an existing user.
 *
 * The version stamped here MUST be the version of the text the user can
 * actually read from the links below — it used to be hardcoded "1.0.0"
 * while the rendered documents said "1.1.0", which made every consent
 * record written through this gate name a document nobody was shown.
 * Import the constant; never restate the literal.
 */
export default function ConsentGate({ stale = false }: { stale?: boolean }) {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!consented) return;
    setError("");
    setSubmitting(true);
    try {
      await api.updateMe({
        consent: {
          dataProcessing: true,
          terms: { version: LEGAL_VERSION },
          privacy: { version: LEGAL_VERSION },
        },
      });
      await refresh();
    } catch {
      setError(t("onboarding.submitError"));
      setSubmitting(false);
    }
  };

  return (
    <div className="cosmic-bg min-h-screen flex flex-col items-center justify-center px-6 text-center text-foreground">
      <BrandLogo size={72} className="mb-6 opacity-90" />
      <h1 className="font-display text-xl text-foreground mb-3">
        {stale ? t("consentGate.updatedTitle") : t("onboarding.confirmTitle")}
      </h1>
      <p className="text-sm text-muted max-w-xs mb-6 leading-relaxed">
        {stale ? t("consentGate.updatedBody") : t("consentGate.body")}
      </p>

      <label className="flex items-start gap-2.5 mb-2 max-w-xs text-left text-[12px] text-muted leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-gold"
        />
        {t("onboarding.consentLabel")}
      </label>

      {/* DPDP: the documents being consented to must be readable at the point of consent */}
      <p className="mb-5 text-[11px] text-muted/70">
        <Link href="/legal/terms" target="_blank" className="text-gold/70 underline underline-offset-2">{t("legal.terms")}</Link>
        {" · "}
        <Link href="/legal/privacy" target="_blank" className="text-gold/70 underline underline-offset-2">{t("legal.privacy")}</Link>
      </p>

      {error && <p className="mb-3 text-[12px] text-red-400">{error}</p>}

      <motion.button
        onClick={handleConfirm}
        disabled={submitting || !consented}
        whileTap={{ scale: 0.98 }}
        className="w-full max-w-xs py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[15px] tracking-wide flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(212,175,55,0.4)] disabled:opacity-50 transition-opacity"
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : t("onboarding.confirmBtn")}
      </motion.button>
    </div>
  );
}
