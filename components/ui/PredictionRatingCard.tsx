'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CalendarDays, Check, Minus, X } from 'lucide-react';
import { getDuePredictions, ratePrediction, type DuePrediction } from '@/lib/api';

/** The backend stores each claim as "<domain>: favourable <dasha level> window, rated <LEVEL>" — a log line, not a sentence. */
const CLAIM = /^([a-z_]+): favourable (\w+) window, rated (\w+)$/i;

const TOPIC_DEFAULTS: Record<string, string> = {
  career: 'Career',
  love: 'Relationships',
  health: 'Health',
  children: 'Children',
  wealth: 'Money',
  education: 'Education',
  property: 'Home & property',
  vehicle: 'Vehicle',
  siblings: 'Siblings',
  parents: 'Parents',
  legal: 'Legal matters',
  foreign: 'Travel abroad',
  spirituality: 'Spiritual growth',
  business: 'Business',
  friends: 'Friends',
};

/** "23 Jul 2026 – 22 Oct 2026" in the reader's language; falls back to the raw text if a date won't parse. */
function formatRange(start: string | null, end: string | null, lang: string): string {
  const fmt = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(lang === 'en' ? 'en-IN' : lang, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const a = fmt(start);
  const b = fmt(end);
  return a && b ? `${a} – ${b}` : b || a;
}

function describe(p: DuePrediction, t: TFunction): { topic: string; sentence: string } {
  const m = CLAIM.exec(p.claim);
  const key = (p.domain ?? m?.[1] ?? '').toLowerCase();
  if (!m || !key) return { topic: '', sentence: p.claim };
  const topic = t(`predictionRating.topics.${key}`, { defaultValue: TOPIC_DEFAULTS[key] ?? key });
  const level = m[3].toLowerCase();
  const strength = t(`predictionRating.levels.${level}`, { defaultValue: level === 'high' ? 'strong' : level === 'medium' ? 'moderate' : level });
  return {
    topic,
    sentence: t('predictionRating.sentence', {
      defaultValue: 'Your chart showed a {{strength}} favourable phase for this area. Did it turn out that way?',
      strength,
    }),
  };
}

/**
 * Asks the user whether a prediction whose window has closed actually happened.
 *
 * This is the half of the accuracy loop that cannot be automated. The backend
 * records every dated claim it makes, but only the user knows the outcome —
 * without this card the accuracy table fills with predictions and never
 * receives a single verdict, which makes every accuracy improvement
 * unmeasurable.
 *
 * Renders nothing at all when there is nothing to ask, so it is safe to mount
 * unconditionally on a surface the user already visits. One claim at a time,
 * oldest first: a stack of "did this happen?" questions reads as an
 * interrogation rather than a check-in.
 */
export default function PredictionRatingCard({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<DuePrediction[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // A failure here must be silent: this is an optional prompt, not content
    // the user asked for, so a network blip should leave the page unchanged.
    getDuePredictions()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = items[0];

  const answer = useCallback(
    async (rating: -1 | 0 | 1) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        await ratePrediction(current.id, rating);
      } catch {
        // Swallowed deliberately: re-asking on the next visit is a better
        // outcome than showing an error for something the user did not request.
      } finally {
        setBusy(false);
        // Advance regardless. A rating that failed to save stays unrated
        // server-side and simply comes back around later.
        setItems((prev) => prev.slice(1));
        setDone(true);
      }
    },
    [current, busy],
  );

  if (!current) {
    // Only acknowledge once the user has actually answered something; an empty
    // queue on first load should render nothing at all.
    if (!done) return null;
    return (
      <div className={`rounded-2xl bg-white/5 p-4 text-sm text-white/70 ${className}`}>
        {t('predictionRating.thanks', 'Thank you — that helps us get better.')}
      </div>
    );
  }

  const range = formatRange(current.windowStart, current.windowEnd, i18n.language);
  const text = describe(current, t);

  return (
    <div
      className={`rounded-2xl border border-gold/15 bg-card p-4 ${className}`}
      data-testid="prediction-rating-card"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
        {t('predictionRating.eyebrow', 'Quick check-in')}
      </p>
      <h3 className="mt-1 font-display text-lg leading-tight text-foreground">
        {t('predictionRating.title', 'How did that period go?')}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {text.topic && (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
            {text.topic}
          </span>
        )}
        {range && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/15 px-2.5 py-1 text-xs text-muted">
            <CalendarDays size={12} aria-hidden />
            {range}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{text.sentence}</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(1)}
          className="flex flex-col items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-2.5 text-xs font-medium leading-tight text-emerald-300 disabled:opacity-50"
        >
          <Check size={16} aria-hidden />
          {t('predictionRating.yes', 'Yes, that happened')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(0)}
          className="flex flex-col items-center gap-1 rounded-xl border border-gold/15 bg-foreground/5 px-2 py-2.5 text-xs font-medium leading-tight text-muted disabled:opacity-50"
        >
          <Minus size={16} aria-hidden />
          {t('predictionRating.unclear', 'Hard to say')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(-1)}
          className="flex flex-col items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-2.5 text-xs font-medium leading-tight text-rose-300 disabled:opacity-50"
        >
          <X size={16} aria-hidden />
          {t('predictionRating.no', "No, it didn't")}
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted">
        {t(
          'predictionRating.why',
          'Your answer is only used to check how accurate our timing is. It is never shared.',
        )}
      </p>
    </div>
  );
}
