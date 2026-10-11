"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, Clock, Loader2 } from "lucide-react";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, type RectifyEvent } from "@/lib/api";
import { shortDateWithYear } from "@/lib/calendar-format";
import { insightsApi, type BirthTimeCheck, type BirthTimeStatus, type EventMatchStrength } from "@/lib/insights-api";
import { journalApi } from "@/lib/journal-api";
import { isPassRequired } from "@/lib/pass-api";
import PassLock from "@/components/pass/PassLock";
import LifeEventRows, { datedEvents, MIN_EVENTS } from "@/components/birth-time/LifeEventRows";

const BAR_TONE = { high: "bg-emerald-400", medium: "bg-gold", low: "bg-amber-500" } as const;
const LEVEL_TONE = {
  high: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  medium: "border-gold/40 bg-gold/15 text-gold",
  low: "border-amber-500/30 bg-amber-500/10 text-amber-400",
} as const;
const STRENGTH_TONE: Record<EventMatchStrength, string> = {
  strong: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  weak: "border-gold/40 bg-gold/15 text-gold",
  none: "border-foreground/15 text-muted",
};

/**
 * Birth Time Confidence: how much Aroha trusts the active profile's birth
 * time, and a check that tests every few minutes around it against the
 * user's own dated life events. Applying a suggestion rebuilds the chart, so
 * it takes a second, deliberate tap. Aroha Pass only: without the Pass it's
 * the compact subscribe lock. Ships off (`home.birthTimeConfidence`).
 */
export default function BirthTimeConfidenceCard({ className = "" }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { enabled } = useNewFeature("home.birthTimeConfidence");
  const { refresh: refreshUser, activeProfile } = useAuth();
  // The Astro Journal is the account owner's own diary, so its life events
  // only fill the form while the owner's own profile is the active one.
  const { enabled: journalOn } = useNewFeature("nav.journal");
  const ownProfile = !activeProfile || activeProfile.isPrimary;
  const [journalEvents, setJournalEvents] = useState<RectifyEvent[]>([]);
  const [status, setStatus] = useState<BirthTimeStatus | null>(null);
  const [locked, setLocked] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [events, setEvents] = useState<RectifyEvent[]>([{ date: "", domain: "job_started" }]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BirthTimeCheck | null>(null);
  const [error, setError] = useState<"notEnough" | "error" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [applied, setApplied] = useState(false);

  const load = useCallback(() => {
    insightsApi
      .birthTime()
      .then((s) => {
        setStatus(s);
        setResult((prev) => prev ?? s.latest);
      })
      .catch((err: unknown) => {
        setStatus(null);
        setLocked(isPassRequired(err));
      });
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  useEffect(() => {
    if (!formOpen || !journalOn || !ownProfile) return;
    journalApi
      .lifeEvents()
      .then((r) => setJournalEvents(r.events))
      .catch(() => setJournalEvents([]));
  }, [formOpen, journalOn, ownProfile]);

  if (enabled && locked) return <PassLock feature={t("birthTime.title")} need="birthTime" compact className={className} />;
  if (!enabled || !status) return null;

  const usable = datedEvents(events);
  const { pct, level, basis } = status.confidence;

  const newFromJournal = journalEvents.filter(
    (j) => !events.some((e) => e.date === j.date && e.domain === j.domain),
  );

  function addFromJournal() {
    setEvents((prev) => [...prev.filter((e) => e.date), ...newFromJournal]);
  }

  async function runCheck() {
    if (usable.length < MIN_EVENTS || busy) return;
    setBusy(true);
    setError(null);
    setConfirming(false);
    try {
      setResult(await insightsApi.runBirthTimeCheck(usable));
      setFormOpen(false);
    } catch (err) {
      if (isPassRequired(err)) setLocked(true);
      else if (err instanceof ApiError && err.message === "NOT_ENOUGH_EVIDENCE") setError("notEnough");
      else setError("error");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!result) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      setResult(await insightsApi.applyBirthTimeCheck(result.id));
      setApplied(true);
      setConfirming(false);
      await refreshUser();
      load();
    } catch (err) {
      if (isPassRequired(err)) setLocked(true);
      else setError("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-3xl border border-gold/20 bg-card p-5 ${className}`} data-testid="birth-time-card">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/15 text-gold">
          <Clock size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gold">{t("birthTime.title")}</h3>
          <p className="text-sm text-foreground">
            {status.time ? t("birthTime.yourTime", { time: status.time.slice(0, 5) }) : t("birthTime.noTime")}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gold/15 bg-background/40 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">{t("birthTime.confidence")}</span>
          <span className="flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${LEVEL_TONE[level]}`}>
              {t(`rectify.level.${level}`)}
            </span>
            <span className="text-lg font-bold leading-none text-foreground">{pct}%</span>
          </span>
        </div>
        <div
          className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-foreground/10"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={`h-full rounded-full ${BAR_TONE[level]}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">{t(`birthTime.basis.${basis}`)}</p>
      </div>

      {result && (
        <div className="mt-3 rounded-2xl border border-gold/15 bg-background/40 p-3.5" data-testid="birth-time-result">
          <p className="text-base font-semibold text-foreground">
            {result.offsetMinutes === 0
              ? t("birthTime.sameTime")
              : t("birthTime.suggested", { time: result.suggestedTime })}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t("birthTime.resultConfidence", { pct: result.confidencePct })} ·{" "}
            {t("birthTime.matches", { strong: result.counts.strong, weak: result.counts.weak })}
          </p>
          <ul className="mt-3 divide-y divide-gold/10 border-y border-gold/10">
            {result.eventMatches.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">{t(`rectify.domain.${m.domain}`)}</span>
                  <span className="block text-[11px] text-muted">{shortDateWithYear(m.date, i18n.language)}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STRENGTH_TONE[m.strength]}`}
                >
                  {t(`birthTime.strength.${m.strength}`)}
                </span>
              </li>
            ))}
          </ul>
          {applied ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Check size={14} />
              {t("birthTime.applied")}
            </p>
          ) : result.canApply ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void apply()}
                className="mt-3 h-11 w-full rounded-2xl bg-gold text-sm font-bold text-[#1a0e00] disabled:opacity-40"
              >
                {t("birthTime.apply", { time: result.suggestedTime })}
              </button>
              {confirming && <p className="mt-2 text-xs leading-relaxed text-amber-400">{t("birthTime.applyConfirm")}</p>}
            </>
          ) : (
            result.confidence === "low" &&
            !result.appliedAt && <p className="mt-3 text-xs leading-relaxed text-muted">{t("birthTime.lowNote")}</p>
          )}
        </div>
      )}

      {!formOpen ? (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="mt-4 h-12 w-full rounded-2xl border border-gold/40 text-sm font-semibold text-gold"
        >
          {t("birthTime.improve")}
        </button>
      ) : (
        <div className="mt-4 border-t border-gold/10 pt-4">
          <p className="text-xs leading-relaxed text-foreground/75">{t("birthTime.improveHint")}</p>
          {newFromJournal.length > 0 && (
            <button
              type="button"
              onClick={addFromJournal}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gold underline underline-offset-2"
            >
              <BookOpen size={13} />
              {t("journal.fromJournal", { count: newFromJournal.length })}
            </button>
          )}
          <div className="mt-4">
            <LifeEventRows events={events} onChange={setEvents} />
          </div>
          <button
            type="button"
            disabled={usable.length < MIN_EVENTS || busy}
            onClick={() => void runCheck()}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold text-sm font-bold text-[#1a0e00] disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {t("birthTime.checking")}
              </>
            ) : (
              t("birthTime.run")
            )}
          </button>
          {usable.length < MIN_EVENTS && (
            <p className="mt-2 text-center text-xs text-muted">{t("rectify.needMore", { count: MIN_EVENTS })}</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-xs text-rose-400">{t(`birthTime.${error}`)}</p>}
    </div>
  );
}
