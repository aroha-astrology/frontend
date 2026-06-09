"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

type Step = "phone" | "otp" | "loading";

export default function SignUpPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const cleaned = phone.replace(/\D/g, "");
  const masked = `+91 ${"•".repeat(6)}${cleaned.slice(-4)}`;

  const handleSend = () => {
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setPhoneErr(t("auth.phoneError"));
      return;
    }
    setPhoneErr("");
    setStep("otp");
    // Mock: any 6-digit code will pass
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

  const handleVerify = () => {
    if (otp.join("").length < 6) return;
    setStep("loading");
    setTimeout(() => { window.location.href = "/onboarding"; }, 1800);
  };

  return (
    <main className="relative z-10 flex flex-col items-center px-6 pb-12">
      {/* Brand mark */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mt-4 mb-6"
      >
        <BrandLogo size={80} priority className="drop-shadow-[0_0_16px_rgba(223,181,100,0.45)]" />
        <div className="mt-3 select-none flex flex-col items-center gap-1">
          <span className="font-display-decorative text-gold text-[22px] leading-none tracking-[0.28em]">AROHA</span>
          <span className="font-display text-[9px] tracking-[0.5em] text-gold/60">ASTROLOGY</span>
        </div>
      </motion.div>

      {/* Incentive pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="mb-5 flex items-center gap-2 px-4 py-2 rounded-full border border-gold/25 bg-gold/8 text-[12px] text-gold"
      >
        <Sparkles size={13} />
        {t("auth.signupBonus")}
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl border border-gold/20 bg-card/85 backdrop-blur-xl p-6 shadow-[0_8px_48px_rgba(0,0,0,0.4)]">
          <AnimatePresence mode="wait">
            {/* ── Phone step ─────────────────────────────────────────── */}
            {step === "phone" && (
              <motion.div key="phone" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h2 className="font-display text-[22px] text-foreground leading-tight mb-1">
                  {t("auth.beginJourney")}
                </h2>
                <p className="text-[13px] text-muted mb-6">{t("auth.enterPhone")}</p>

                <label className="block text-[11px] font-medium text-gold/70 tracking-widest uppercase mb-2">
                  {t("auth.phoneLabel")}
                </label>
                <div className={`flex items-center rounded-xl border bg-surface transition-colors overflow-hidden ${phoneErr ? "border-red-400/60" : "border-gold/20 focus-within:border-gold/50"}`}>
                  <span className="pl-4 pr-2 text-[15px] text-muted select-none shrink-0">🇮🇳 +91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setPhoneErr(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={t("auth.phonePlaceholder")}
                    className="flex-1 bg-transparent py-4 pr-4 text-[15px] text-foreground placeholder:text-muted/40 outline-none"
                  />
                </div>
                {phoneErr && <p className="mt-2 text-[12px] text-red-400">{phoneErr}</p>}

                <button
                  onClick={handleSend}
                  className="mt-5 w-full py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(212,175,55,0.35)] active:scale-[0.98] transition-transform"
                >
                  {t("auth.sendOtp")} <ArrowRight size={16} />
                </button>

                <p className="mt-5 text-center text-[11px] text-muted/60 leading-relaxed">
                  {t("auth.terms")}{" "}
                  <span className="text-gold/70 underline underline-offset-2 cursor-pointer">{t("auth.termsLink")}</span>
                </p>
              </motion.div>
            )}

            {/* ── OTP step ───────────────────────────────────────────── */}
            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <button
                  onClick={() => { setOtp(["","","","","",""]); setStep("phone"); }}
                  className="flex items-center gap-1 text-[12px] text-muted mb-5 -ml-0.5 hover:text-foreground transition-colors"
                >
                  <ChevronLeft size={14} /> {t("auth.changeNumber")}
                </button>

                <h2 className="font-display text-[22px] text-foreground leading-tight mb-1">{t("auth.verifyOtp")}</h2>
                <p className="text-[13px] text-muted mb-6">
                  {t("auth.otpSentTo")}{" "}
                  <span className="text-foreground font-medium">{masked}</span>
                </p>

                <div className="flex gap-2 justify-between mb-6" onPaste={handleOtpPaste}>
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
                      className="w-12 h-14 text-center text-[22px] font-bold text-foreground rounded-xl border border-gold/20 bg-surface focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.12)] outline-none transition-all"
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerify}
                  disabled={otp.join("").length < 6}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                >
                  {t("auth.verifyOtp")} <ArrowRight size={16} />
                </button>

                <button onClick={handleSend} className="mt-4 w-full text-center text-[12px] text-gold/60 hover:text-gold transition-colors py-1">
                  {t("auth.resend")}
                </button>
              </motion.div>
            )}

            {/* ── Loading ────────────────────────────────────────────── */}
            {step === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10 gap-4">
                <Loader2 size={36} className="text-gold animate-spin" />
                <p className="font-display text-[16px] text-foreground">{t("auth.creatingAccount")}</p>
                <p className="text-[12px] text-muted">{t("auth.preparingJourney")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === "phone" && (
          <p className="mt-6 text-center text-[13px] text-muted">
            {t("auth.hasAccount")}{" "}
            <Link href="/sign-in" className="text-gold font-medium hover:text-gold-light transition-colors">
              {t("auth.signIn")}
            </Link>
          </p>
        )}
      </motion.div>
    </main>
  );
}
