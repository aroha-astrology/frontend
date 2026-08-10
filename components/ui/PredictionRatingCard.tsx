'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDuePredictions, ratePrediction, type DuePrediction } from '@/lib/api';

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
  const { t } = useTranslation();
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

  const window =
    current.windowStart && current.windowEnd
      ? `${current.windowStart} → ${current.windowEnd}`
      : (current.windowEnd ?? '');

  return (
    <div className={`rounded-2xl bg-white/5 p-4 ${className}`}>
      <p className="text-sm font-medium text-white">
        {t('predictionRating.title', 'How did that period go?')}
      </p>
      <p className="mt-1 text-xs text-white/60">{window}</p>
      <p className="mt-2 text-sm text-white/80">{current.claim}</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(1)}
          className="flex-1 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
        >
          {t('predictionRating.yes', 'Yes, that happened')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(0)}
          className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/70 disabled:opacity-50"
        >
          {t('predictionRating.unclear', 'Hard to say')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(-1)}
          className="flex-1 rounded-xl bg-rose-500/20 px-3 py-2 text-sm text-rose-200 disabled:opacity-50"
        >
          {t('predictionRating.no', "No, it didn't")}
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-white/40">
        {t(
          'predictionRating.why',
          'Your answer is only used to check how accurate our timing is. It is never shared.',
        )}
      </p>
    </div>
  );
}
