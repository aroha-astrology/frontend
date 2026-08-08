"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { usePhoneAuth, RECAPTCHA_CONTAINER_ID } from "@/hooks/usePhoneAuth";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAppleAuth } from "@/hooks/useAppleAuth";
import { useAuthMethod } from "@/hooks/useAuthMethod";
import GoogleSignInButton from "./GoogleSignInButton";
import AppleSignInButton from "./AppleSignInButton";

type Step = "method" | "otp" | "loading";

// Flip to true once the Apple Developer (Services ID, Sign in with Apple key)
// and Firebase Apple-provider setup is complete — the client code is already
// wired (see hooks/useAppleAuth.ts), it just isn't switched on yet.
const APPLE_SIGNIN_READY = false;

interface AuthMethodPanelProps {
  variant: "sign-in" | "sign-up";
  /** Fires whenever the panel is on its idle top-level step — the page uses this to show/hide its footer (cross-link, bonus pill) exactly like the old per-page step machine did. */
  onIdleChange?: (idle: boolean) => void;
}

/**
 * The auth card shared by the sign-in and sign-up pages. India gets Firebase
 * phone OTP only; Google (and the iOS Apple button) is offered outside India
 * (region detected server-side via `/api/region`). Brand mark, incentive
 * pill, and cross-link footer stay in the page — only the card body lives
 * here.
 */
export default function AuthMethodPanel({ variant, onIdleChange }: AuthMethodPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { method, loading: methodLoading, setOverride } = useAuthMethod();
  const phoneAuth = usePhoneAuth();
  const googleAuth = useGoogleAuth();
  const appleAuth = useAppleAuth();

  const [step, setStep] = useState<Step>("method");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Apple sign-in is iOS-only (App Store guideline 4.8 compliance, not a
  // general-purpose login method) — detected once on mount.
  const [showApple, setShowApple] = useState(false);

  useEffect(() => {
    onIdleChange?.(!methodLoading && step === "method");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodLoading, step]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!cancelled) setShowApple(Capacitor.getPlatform() === "ios");
      } catch {
        // @capacitor/core not resolvable (plain web build) — Apple stays hidden.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cleaned = phone.replace(/\D/g, "");
  const masked = `+91 ${"•".repeat(6)}${cleaned.slice(-4)}`;
  const socialErrorKey = googleAuth.errorKey ?? appleAuth.errorKey;
  const socialError = socialErrorKey ? t(socialErrorKey) : "";
  const errorText = phoneAuth.errorKey ? t(phoneAuth.errorKey) : "";

  function goToNext(created: boolean) {
    router.replace(created ? "/onboarding" : "/");
  }

  const handleSend = async () => {
    const { ok } = await phoneAuth.sendOtp(cleaned);
    if (!ok) return;
    setOtp(["", "", "", "", "", ""]);
    setStep("otp");
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) { setOtp(digits.split("")); otpRefs.current[5]?.focus(); }
  };

  const handleVerify = async () => {
    if (otp.join("").length < 6) return;
    setStep("loading");
    const { ok, created } = await phoneAuth.confirmOtp(otp.join(""));
    if (!ok) { setStep("otp"); return; }
    goToNext(Boolean(created));
  };

  const handleGoogle = async () => {
    setStep("loading");
    const { ok, created } = await googleAuth.signIn();
    if (!ok) { setStep("method"); return; }
    goToNext(Boolean(created));
  };

  const handleApple = async () => {
    setStep("loading");
    const { ok, created } = await appleAuth.signIn();
    if (!ok) { setStep("method"); return; }
    goToNext(Boolean(created));
  };

  const heading = variant === "sign-in" ? t("auth.welcomeBack") : t("auth.beginJourney");
  const loadingHeading = variant === "sign-in" ? t("auth.signingIn") : t("auth.creatingAccount");

  const socialButtons = (
    <>
      {socialError && <p className="mb-3 text-[12px] text-red-400">{socialError}</p>}
      <GoogleSignInButton onClick={handleGoogle} busy={googleAuth.busy} />
      {showApple && (
        <AppleSignInButton onClick={handleApple} busy={appleAuth.busy} comingSoon={!APPLE_SIGNIN_READY} />
      )}
    </>
  );

  return (
    <div className="rounded-2xl border border-gold/20 bg-card/85 backdrop-blur-xl p-6 shadow-[0_8px_48px_rgba(0,0,0,0.4)]">
      {method === "phone" && <div id={RECAPTCHA_CONTAINER_ID} />}

      <AnimatePresence mode="wait">
        {/* ── Loading state while the region is being detected ────── */}
        {methodLoading && (
          <motion.div key="detecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-14">
            <Loader2 size={28} className="text-gold/60 animate-spin" />
          </motion.div>
        )}

        {/* ── Phone step ─────────────────────────────────────────── */}
        {!methodLoading && method === "phone" && step === "method" && (
          <motion.div key="phone" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <h2 className="font-display text-[22px] text-foreground leading-tight mb-1">{heading}</h2>
            <p className="text-[13px] text-muted mb-6">{t("auth.enterPhone")}</p>

            <label className="block text-[11px] font-medium text-gold/70 tracking-widest uppercase mb-2">
              {t("auth.phoneLabel")}
            </label>
            <div className={`flex items-center rounded-xl border bg-surface transition-colors overflow-hidden ${errorText ? "border-red-400/60" : "border-gold/20 focus-within:border-gold/50"}`}>
              <span className="pl-4 pr-2 text-[15px] text-muted select-none shrink-0">🇮🇳 +91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); phoneAuth.setErrorKey(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={t("auth.phonePlaceholder")}
                className="flex-1 bg-transparent py-4 pr-4 text-[15px] text-foreground placeholder:text-muted/40 outline-none"
              />
            </div>
            {errorText && <p className="mt-2 text-[12px] text-red-400">{errorText}</p>}

            <button
              onClick={handleSend}
              disabled={phoneAuth.sending}
              className="mt-5 w-full py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(212,175,55,0.35)] disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {phoneAuth.sending ? <Loader2 size={16} className="animate-spin" /> : <>{t("auth.sendOtp")} <ArrowRight size={16} /></>}
            </button>

            <p className="mt-5 text-center text-[11px] text-muted/60 leading-relaxed">
              {t("auth.terms")}{" "}
              <Link href="/legal/terms" className="text-gold/70 underline underline-offset-2">{t("legal.terms")}</Link>
              {" · "}
              <Link href="/legal/privacy" className="text-gold/70 underline underline-offset-2">{t("legal.privacy")}</Link>
            </p>

            <button
              onClick={() => setOverride("google")}
              className="mt-4 w-full text-center text-[11px] text-muted/60 hover:text-gold transition-colors underline underline-offset-2"
            >
              {t("auth.notInIndia")}
            </button>
          </motion.div>
        )}

        {/* ── Google step ────────────────────────────────────────── */}
        {!methodLoading && method === "google" && step === "method" && (
          <motion.div key="google" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <h2 className="font-display text-[22px] text-foreground leading-tight mb-1">{heading}</h2>
            <p className="text-[13px] text-muted mb-6">{t("auth.googleSubtitle")}</p>

            {socialButtons}

            <p className="mt-5 text-center text-[11px] text-muted/60 leading-relaxed">
              {t("auth.terms")}{" "}
              <Link href="/legal/terms" className="text-gold/70 underline underline-offset-2">{t("legal.terms")}</Link>
              {" · "}
              <Link href="/legal/privacy" className="text-gold/70 underline underline-offset-2">{t("legal.privacy")}</Link>
            </p>

            <button
              onClick={() => setOverride("phone")}
              className="mt-4 w-full text-center text-[11px] text-muted/60 hover:text-gold transition-colors underline underline-offset-2"
            >
              {t("auth.inIndiaInstead")}
            </button>
          </motion.div>
        )}

        {/* ── OTP step (phone only) ─────────────────────────────── */}
        {step === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <button
              onClick={() => { setOtp(["","","","","",""]); phoneAuth.setErrorKey(null); setStep("method"); }}
              className="flex items-center gap-1 text-[12px] text-muted mb-5 -ml-0.5 hover:text-foreground transition-colors"
            >
              <ChevronLeft size={14} /> {t("auth.changeNumber")}
            </button>

            <h2 className="font-display text-[22px] text-foreground leading-tight mb-1">{t("auth.verifyOtp")}</h2>
            <p className="text-[13px] text-muted mb-6">
              {t("auth.otpSentTo")}{" "}
              <span className="text-foreground font-medium">{masked}</span>
            </p>

            <div className="grid grid-cols-6 gap-2 mb-3" onPaste={handleOtpPaste}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  className="w-full h-14 text-center text-[22px] font-bold text-foreground rounded-xl border border-gold/20 bg-surface focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.12)] outline-none transition-all"
                />
              ))}
            </div>

            {errorText && <p className="mb-3 text-[12px] text-red-400">{errorText}</p>}

            <button
              onClick={handleVerify}
              disabled={otp.join("").length < 6 || phoneAuth.verifying}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {phoneAuth.verifying ? <Loader2 size={16} className="animate-spin" /> : <>{t("auth.verifyOtp")} <ArrowRight size={16} /></>}
            </button>

            <button onClick={handleSend} disabled={phoneAuth.sending} className="mt-4 w-full text-center text-[12px] text-gold/60 hover:text-gold transition-colors py-1 disabled:opacity-50">
              {t("auth.resend")}
            </button>
          </motion.div>
        )}

        {/* ── Loading ────────────────────────────────────────────── */}
        {step === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10 gap-4">
            <Loader2 size={36} className="text-gold animate-spin" />
            <p className="font-display text-[16px] text-foreground">{loadingHeading}</p>
            {variant === "sign-up" && <p className="text-[12px] text-muted">{t("auth.preparingJourney")}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
