"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Loader2 } from "lucide-react";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, type RectifyDomain, type RectifyEvent } from "@/lib/api";
import { insightsApi, type BirthTimeCheck, type BirthTimeStatus } from "@/lib/insights-api";
import { journalApi } from "@/lib/journal-api";
import { isPassRequired } from "@/lib/pass-api";
import PassLock from "@/components/pass/PassLock";
import { DOMAIN_GROUPS, MIN_EVENTS } from "@/components/ui/BirthTimeRectifyCard";

const BAR_TONE = { high: "bg-emerald-400", medium: "bg-gold", low: "bg-amber-500" } as const;

/**
 * Birth Time Confidence: how much Aroha trusts the active profile's birth
 * time, and a check that tests every few minutes around it against the
 * user's own dated life events. Applying a suggestion rebuilds the chart, so
 * it takes a second, deliberate tap. Aroha Pass only: without the Pass it's
 * the compact subscribe lock. Ships off (`home.birthTimeConfidence`).
 */
export default function BirthTimeConfidenceCard({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
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

  if (enabled && locked) return <PassLock feature={t("birthTime.title")} compact className={className} />;
  if (!enabled || !status) return null;

  const usable = events.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  const { pct, level, basis } = status.confidence;

  function update(i: number, patch: Partial<RectifyEvent>) {
    setEvents((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

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
    <div className={`rounded-2xl border border-gold/15 bg-white/5 p-5 ${className}`}>
      <div className="flex items-center gap-2 text-gold">
        <Clock size={16} />
        <h3 className="text-sm font-semibold">{t("birthTime.title")}</h3>
      </div>

      <p className="mt-2 text-sm text-foreground">
        {status.time ? t("birthTime.yourTime", { time: status.time.slice(0, 5) }) : t("birthTime.noTime")}
      </p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted mb-1">
          <span>{t("birthTime.confidence")}</span>
          <span className="font-semibold text-foreground">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${BAR_TONE[level]}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{t(`birthTime.basis.${basis}`)}</p>
      </div>

      {result && (
        <div className="mt-4 rounded-xl bg-white/5 p-3 space-y-1.5">
          <p className="text-sm text-foreground">
            {result.offsetMinutes === 0
              ? t("birthTime.sameTime")
              : t("birthTime.suggested", { time: result.suggestedTime })}
          </p>
          <p className="text-[11px] text-muted">
            {t("birthTime.resultConfidence", { pct: result.confidencePct })} ·{" "}
            {t("birthTime.matches", { strong: result.counts.strong, weak: result.counts.weak })}
          </p>
          <ul className="space-y-0.5">
            {result.eventMatches.map((m, i) => (
              <li key={i} className="flex justify-between gap-2 text-[11px]">
                <span className="text-foreground/80 truncate">
                  {t(`rectify.domain.${m.domain}`)} · {m.date}
                </span>
                <span className={m.strength === "strong" ? "text-emerald-400" : m.strength === "weak" ? "text-gold" : "text-muted"}>
                  {t(`birthTime.strength.${m.strength}`)}
                </span>
              </li>
            ))}
          </ul>
          {applied ? (
            <p className="text-xs text-emerald-400">{t("birthTime.applied")}</p>
          ) : result.canApply ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void apply()}
                className="mt-1 w-full rounded-xl bg-gold/20 px-3 py-2 text-xs font-semibold text-gold disabled:opacity-40"
              >
                {t("birthTime.apply", { time: result.suggestedTime })}
              </button>
              {confirming && <p className="text-[11px] text-amber-300">{t("birthTime.applyConfirm")}</p>}
            </>
          ) : (
            result.confidence === "low" && !result.appliedAt && <p className="text-[11px] text-muted">{t("birthTime.lowNote")}</p>
          )}
        </div>
      )}

      {!formOpen ? (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="mt-4 w-full rounded-xl border border-gold/30 px-3 py-2.5 text-sm font-medium text-gold"
        >
          {t("birthTime.improve")}
        </button>
      ) : (
        <div className="mt-4">
          <p className="text-[11px] leading-snug text-muted">{t("birthTime.improveHint")}</p>
          {newFromJournal.length > 0 && (
            <button
              type="button"
              onClick={addFromJournal}
              className="mt-2 text-xs font-medium text-gold underline underline-offset-2"
            >
              {t("journal.fromJournal", { count: newFromJournal.length })}
            </button>
          )}
          <div className="mt-3 space-y-2">
            {events.map((e, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="date"
                  value={e.date}
                  onChange={(ev) => update(i, { date: ev.target.value })}
                  className="min-w-0 flex-1 rounded-xl border border-gold/10 bg-transparent px-3 py-2 text-base text-foreground"
                />
                <select
                  value={e.domain}
                  onChange={(ev) => update(i, { domain: ev.target.value as RectifyDomain })}
                  className="rounded-xl border border-gold/10 bg-transparent px-2 py-2 text-base text-foreground"
                >
                  {DOMAIN_GROUPS.map(({ group, options }) => (
                    <optgroup key={group} label={t(`rectify.group.${group}`)} className="bg-neutral-900">
                      {options.map((d) => (
                        <option key={d} value={d} className="bg-neutral-900">
                          {t(`rectify.domain.${d}`)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEvents((p) => [...p, { date: "", domain: "job_started" }])}
            className="mt-2 text-xs text-gold/80"
          >
            {t("rectify.addEvent")}
          </button>
          <button
            type="button"
            disabled={usable.length < MIN_EVENTS || busy}
            onClick={() => void runCheck()}
            className="mt-4 w-full rounded-xl bg-gold/20 px-3 py-2.5 text-sm font-semibold text-gold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("birthTime.checking")}
              </>
            ) : (
              t("birthTime.run")
            )}
          </button>
          {usable.length < MIN_EVENTS && (
            <p className="mt-2 text-center text-[11px] text-muted">{t("rectify.needMore", { count: MIN_EVENTS })}</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-xs text-rose-300">{t(`birthTime.${error}`)}</p>}
    </div>
  );
}
