'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  rectifyBirthTime,
  type RectifyDomain,
  type RectifyEvent,
  type RectifySuggestion,
} from '@/lib/api';

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

const DOMAINS: RectifyDomain[] = [
  'career',
  'marriage',
  'childbirth',
  'health',
  'property',
  'education',
  'loss',
];

/** The server refuses to suggest a time below this many dated events. */
const MIN_EVENTS = 3;

export default function BirthTimeRectifyCard({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<RectifyEvent[]>([{ date: '', domain: 'career' }]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RectifySuggestion | null>(null);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState(false);

  const usable = events.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  const canSubmit = usable.length >= MIN_EVENTS && !busy;

  function update(i: number, patch: Partial<RectifyEvent>) {
    setEvents((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

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

  return (
    <div className={`rounded-2xl border border-gold/10 bg-white/5 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gold">
        {t('rectify.title', 'Check your birth time')}
      </h3>
      <p className="mt-1 text-xs leading-snug text-white/60">
        {t(
          'rectify.intro',
          'Your birth time decides your rising sign and all your timing. Add at least three dated events and we can check whether your stated time fits them.',
        )}
      </p>

      <div className="mt-4 space-y-2">
        {events.map((e, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="date"
              value={e.date}
              onChange={(ev) => update(i, { date: ev.target.value })}
              className="min-w-0 flex-1 rounded-xl border border-gold/10 bg-transparent px-3 py-2 text-sm text-white"
            />
            <select
              value={e.domain}
              onChange={(ev) => update(i, { domain: ev.target.value as RectifyDomain })}
              className="rounded-xl border border-gold/10 bg-transparent px-2 py-2 text-sm text-white"
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d} className="bg-neutral-900">
                  {t(`rectify.domain.${d}`, d)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setEvents((p) => [...p, { date: '', domain: 'career' }])}
        className="mt-2 text-xs text-gold/80"
      >
        {t('rectify.addEvent', '+ Add another event')}
      </button>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-xl bg-gold/20 px-3 py-2.5 text-sm font-medium text-gold disabled:opacity-40"
      >
        {busy
          ? t('rectify.checking', 'Checking…')
          : t('rectify.submit', 'Check my birth time')}
      </button>

      {usable.length < MIN_EVENTS && (
        <p className="mt-2 text-center text-[11px] text-white/40">
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
        <p className="mt-3 text-sm text-white/70">
          {t(
            'rectify.noSuggestion',
            'These events do not point to any one time more than another, so your stated time stands. Adding more dated events would sharpen this.',
          )}
        </p>
      )}

      {ran && result && (
        <div className="mt-4 rounded-xl bg-white/5 p-3">
          <p className="text-sm text-white">
            {t('rectify.suggested', 'Suggested time: {{time}}', { time: result.time })}
            {result.offsetMinutes !== 0 && (
              <span className="text-white/50">
                {' '}
                ({result.offsetMinutes > 0 ? '+' : ''}
                {result.offsetMinutes} min)
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-white/60">
            {t('rectify.confidence', 'Confidence: {{level}}', {
              level: t(`rectify.level.${result.confidence}`, result.confidence),
            })}
            {' · '}
            {result.reasoning}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-white/40">
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
