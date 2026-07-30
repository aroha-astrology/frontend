"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import AuthMethodPanel from "@/components/auth/AuthMethodPanel";

export default function SignInPage() {
  const { t } = useTranslation();
  const [showFooter, setShowFooter] = useState(true);

  return (
    <main className="relative z-10 flex flex-col items-center px-6 pb-12">
      {/* Brand mark */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mt-4 mb-8"
      >
        <BrandLogo size={80} priority className="drop-shadow-[0_0_16px_rgba(223,181,100,0.45)]" />
        <div className="mt-3 select-none flex flex-col items-center gap-1">
          <span className="font-display-decorative text-gold text-[22px] leading-none tracking-[0.28em]">AROHA</span>
          <span className="font-display text-[9px] tracking-[0.5em] text-gold/60">ASTROLOGY</span>
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="w-full max-w-sm"
      >
        <AuthMethodPanel variant="sign-in" onIdleChange={setShowFooter} />

        {showFooter && (
          <>
            <p className="mt-6 text-center text-[13px] text-muted">
              {t("auth.noAccount")}{" "}
              <Link href="/sign-up" className="text-gold font-medium hover:text-gold-light transition-colors">
                {t("auth.signUp")}
              </Link>
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[12px] text-gold/80">
              <Sparkles size={12} />
              {t("auth.newUserBonus")}
            </p>
          </>
        )}
      </motion.div>
    </main>
  );
}
