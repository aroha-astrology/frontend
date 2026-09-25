"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BookHeart, Check, ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { istToday } from "@/lib/calendar-format";
import { journalApi } from "@/lib/journal-api";

const FACES = ["😞", "🙁", "😐", "🙂", "😄"];

/**
 * Home's "How was today?" (home.journalPrompt, ships off): one tap logs
 * today's mood into the Astro Journal without touching the rest of the day's
 * entry (the server merges).
 */
export default function JournalPromptCard() {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("home.journalPrompt");
  const { enabled: pageOn } = useNewFeature("nav.journal");
  const [mood, setMood] = useState<number | null | undefined>(undefined);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const today = istToday();
    journalApi
      .list({ from: today, to: today })
      .then((res) => !cancelled && setMood(res.entries[0]?.mood ?? null))
      .catch(() => !cancelled && setMood(null));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || mood === undefined) return null;

  async function pick(n: number) {
    const previous = mood;
    setMood(n);
    try {
      await journalApi.save(istToday(), { mood: n });
      setJustSaved(true);
    } catch {
      setMood(previous ?? null);
    }
  }

  return (
    <Card className="p-5 border-gold/15" data-testid="journal-card">
      <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
        <BookHeart size={14} />
        {t("journal.card.title")}
      </p>
      <div className="flex justify-between gap-2">
        {FACES.map((face, i) => (
          <button
            key={face}
            type="button"
            aria-label={t("journal.rateAria", { field: t("journal.ratings.mood"), n: i + 1 })}
            aria-pressed={mood === i + 1}
            onClick={() => void pick(i + 1)}
            className={`h-11 flex-1 rounded-2xl border text-xl transition-colors ${
              mood === i + 1 ? "border-gold bg-gold/15" : "border-gold/10 opacity-70"
            }`}
          >
            {face}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 text-muted">
          {mood !== null && (
            <>
              <Check size={12} className="text-emerald-400" />
              {t(justSaved ? "journal.card.saved" : "journal.card.logged")}
            </>
          )}
        </span>
        {pageOn && (
          <Link href="/journal" className="flex items-center gap-0.5 font-medium text-gold">
            {t("journal.card.open")}
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
    </Card>
  );
}
