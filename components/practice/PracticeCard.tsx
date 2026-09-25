"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, Flame, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { practiceApi, type PracticeToday } from "@/lib/practice-api";
import { practiceItemTitle } from "@/lib/practice-format";

/**
 * Home's Today's Practice card (home.dailyPractice, ships off): the day's
 * items with a tick each. Chanting happens on /practice; here an item can
 * simply be marked done.
 */
export default function PracticeCard() {
  const { t, i18n } = useTranslation();
  const { enabled } = useNewFeature("home.dailyPractice");
  const { enabled: pageOn } = useNewFeature("nav.dailyPractice");
  const [today, setToday] = useState<PracticeToday | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    practiceApi
      .today()
      .then((res) => !cancelled && setToday(res))
      .catch(() => !cancelled && setToday(null));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || !today || today.items.length === 0) return null;

  return (
    <Card className="p-5 border-gold/15" data-testid="practice-card">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
          <Sparkles size={14} />
          {t("practice.card.title")}
        </p>
        {today.streak > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <Flame size={12} className="text-orange-400" />
            {t("practice.streak", { count: today.streak })}
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {today.items.map((item) => {
          const done = today.done.includes(item.id);
          return (
            <li key={item.id} className="flex items-center gap-3">
              <button
                type="button"
                aria-label={t(done ? "practice.done" : "practice.markDone")}
                aria-pressed={done}
                disabled={done}
                onClick={() => practiceApi.complete(item.id).then(setToday).catch(() => {})}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  done ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300" : "border-gold/30"
                }`}
              >
                {done && <Check size={14} />}
              </button>
              <span className={`text-sm ${done ? "text-muted line-through" : "text-foreground/90"}`}>
                {practiceItemTitle(t, item, i18n.language)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-muted">{t("practice.progress", { done: today.done.length, total: today.items.length })}</span>
        {pageOn && (
          <Link href="/practice" className="flex items-center gap-0.5 font-medium text-gold">
            {t("practice.card.open")}
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
    </Card>
  );
}
