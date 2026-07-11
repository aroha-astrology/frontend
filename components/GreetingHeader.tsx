"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { UserCircle } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

function timeOfDayKey(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/**
 * Compact personalized header at the top of the home dashboard — replaces
 * the old large centered logo hero. Shows a placeholder avatar (no
 * `photoURL` field exists on `User` yet) and a first-name greeting with a
 * time-of-day line. The credit balance lives in `TopBar` instead.
 */
export default function GreetingHeader() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const firstName = user?.displayName?.trim().split(/\s+/)[0] ?? null;
  const greetingKey = timeOfDayKey(new Date().getHours());

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-5 pt-8 pb-2 flex items-center gap-3"
    >
      <div className="w-11 h-11 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-gold shrink-0">
        <UserCircle size={26} />
      </div>
      <div>
        <p className="text-foreground text-base font-semibold leading-tight">
          {firstName ? t("home.namaste", { name: firstName }) : t("home.namasteGuest")}
        </p>
        <p className="text-muted text-xs">{t(`home.greeting.${greetingKey}`)}</p>
      </div>
    </motion.div>
  );
}
