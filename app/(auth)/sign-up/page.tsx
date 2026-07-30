"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import AuthMethodPanel from "@/components/auth/AuthMethodPanel";

export default function SignUpPage() {
  const { t } = useTranslation();
  const [showFooter, setShowFooter] = useState(true);

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
        <AuthMethodPanel variant="sign-up" onIdleChange={setShowFooter} />

        {showFooter && (
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
