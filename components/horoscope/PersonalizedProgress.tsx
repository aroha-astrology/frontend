"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

const STEP_MS = 2000;
const STEP_KEYS = [
  "todayReadingStep1",
  "todayReadingStep2",
  "todayReadingStep3",
  "todayReadingStep4",
] as const;

/**
 * Shown in place of a plain skeleton while a personalized horoscope is still
 * being generated (state "loading"/"generating" in
 * usePersonalizedHoroscope) — used by both Home's TodayReading card and the
 * /horoscope page's PersonalizedCard, for every period (daily/weekly/
 * monthly/yearly). Ticks one step every STEP_MS, capped at the
 * second-to-last step — the final step only ever checks off when the parent
 * swaps this out for the real card on state "ready", so it never claims done
 * before the reading actually is. Step copy is period-agnostic on purpose
 * (chart/transits/dasha/predictions apply the same way regardless of period).
 */
export default function PersonalizedProgress({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
    }, STEP_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <Card className="p-5 border-gold/10">
      <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-4">
        <Sparkles size={14} />
        {t(titleKey)}
      </div>
      <div className="flex flex-col gap-3">
        {STEP_KEYS.map((key, i) => {
          const active = i === step;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: i <= step ? 1 : 0.35, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2.5"
            >
              {i < step ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              ) : (
                <Circle size={16} className={`shrink-0 ${active ? "text-gold animate-pulse" : "text-muted/40"}`} />
              )}
              <span className={`text-sm ${i < step ? "text-foreground/80" : "text-muted"}`}>
                {t(`home.${key}`)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
