'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeature, useNewFeature } from '@/hooks/useFeature';
import { rectifyBirthTime, type RectifyEvent, type RectifySuggestion } from '@/lib/api';
import LifeEventRows, { datedEvents, MIN_EVENTS } from '@/components/birth-time/LifeEventRows';

/**
 * Suggests a corrected birth time from dated life events the user supplies.
 *
 * Worth the friction because birth time is the single input every other
 * prediction hangs off: the Ascendant, every house, every divisional chart and
 * every dasha date. A half-hour error moves the Ascendant a whole sign.
 *
 * The server NEVER applies the suggestion — it returns one and stops. Silently
 * rewriting a stored birth time would rebuild every chart and report the user
 * has already read, so accepting it stays a deliberate action taken elsewhere.
 * This card is explicit about that rather than implying the fix is automatic.
 */

export default function BirthTimeRectifyCard({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  // New card: OFF by default (see config/features.ts's `home.birthTimeRectify`
  // — standing rule, every new card ships dark until an admin turns it on).
  // useFeature fails OPEN for keys it does not recognise, so an explicit
  // `enabled === false` from the backend is what actually hides this, not a
  // missing/unknown key.
  const { enabled } = useFeature('home.birthTimeRectify');
  // The Birth Time Confidence card supersedes this one wherever both are on.
  const { enabled: confidenceCardOn } = useNewFeature('home.birthTimeConfidence');
  const [events, setEvents] = useState<RectifyEvent[]>([{ date: '', domain: 'job_started' }]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RectifySuggestion | null>(null);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState(false);

  const usable = datedEvents(events);
  const canSubmit = usable.length >= MIN_EVENTS && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(false);
    try {
      setResult(await rectifyBirthTime(usable));
      setRan(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!enabled || confidenceCardOn) return null;

  return (
    <div className={`rounded-3xl border border-gold/20 bg-card p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gold">
        {t('rectify.title', 'Check your birth time')}
      </h3>
      <p className="mt-1 text-xs leading-snug text-foreground/75">
        {t(
          'rectify.intro',
          "Not sure your birth time is exact? It decides your rising sign and all your timing. Add 3 or more major life events with their dates — a wedding, a new job, a child's birth — and we'll try to work out your real birth time.",
        )}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-muted">
        {t(
          'rectify.hint',
          'The more events you add, the sharper the result. We check within an hour either side of the time you gave us, and nothing is changed without you.',
        )}
      </p>

      <div className="mt-4">
        <LifeEventRows events={events} onChange={setEvents} />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void submit()}
        className="mt-4 h-12 w-full rounded-2xl bg-gold text-sm font-bold text-[#1a0e00] disabled:opacity-40"
      >
        {busy
          ? t('rectify.checking', 'Checking…')
          : t('rectify.submit', 'Check my birth time')}
      </button>

      {usable.length < MIN_EVENTS && (
        <p className="mt-2 text-center text-[11px] text-muted">
          {t('rectify.needMore', 'Add at least {{count}} dated events.', {
            count: MIN_EVENTS,
          })}
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-rose-300">
          {t('rectify.error', "We couldn't check that right now. Please try again.")}
        </p>
      )}

      {ran && !error && !result && (
        <p className="mt-3 text-sm text-foreground/85">
          {t(
            'rectify.noSuggestion',
            'These events do not point to any one time more than another, so your stated time stands. Adding more dated events would sharpen this.',
          )}
        </p>
      )}

      {ran && result && (
        <div className="mt-4 rounded-2xl border border-gold/15 bg-background/40 p-3">
          <p className="text-sm text-foreground">
            {t('rectify.suggested', 'Suggested time: {{time}}', { time: result.time })}
            {result.offsetMinutes !== 0 && (
              <span className="text-muted">
                {' '}
                ({result.offsetMinutes > 0 ? '+' : ''}
                {result.offsetMinutes} min)
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-foreground/75">
            {t('rectify.confidence', 'Confidence: {{level}}', {
              level: t(`rectify.level.${result.confidence}`, result.confidence),
            })}
            {' · '}
            {result.reasoning}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            {t(
              'rectify.notApplied',
              'This is only a suggestion — nothing has been changed. Update your birth details yourself if you want to use it.',
            )}
          </p>
        </div>
      )}
    </div>
  );
}
