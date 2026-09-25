"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookHeart, ChevronDown, Flame, Trash2 } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import { DOMAIN_GROUPS } from "@/components/ui/BirthTimeRectifyCard";
import type { RectifyDomain } from "@/lib/api";
import { shortDate } from "@/lib/calendar-format";
import { dayLabel } from "@/lib/decision-format";
import {
  MAX_EVENTS_PER_DAY,
  MAX_NOTE_LENGTH,
  RATING_FIELDS,
  journalApi,
  type JournalEntry,
  type JournalHighlight,
  type JournalInsights,
  type RatingField,
} from "@/lib/journal-api";
import { useNewFeature } from "@/hooks/useFeature";

type Draft = Record<RatingField, number | null> & { note: string; events: RectifyDomain[] };

const EMPTY: Draft = { mood: null, energy: null, career: null, relationship: null, money: null, note: "", events: [] };

function draftOf(entry: JournalEntry | undefined): Draft {
  if (!entry) return EMPTY;
  return {
    mood: entry.mood,
    energy: entry.energy,
    career: entry.career,
    relationship: entry.relationship,
    money: entry.money,
    note: entry.note ?? "",
    events: entry.events,
  };
}

function RatingRow({ field, value, onChange }: { field: RatingField; value: number | null; onChange: (v: number | null) => void }) {
  const { t } = useTranslation();
  const label = t(`journal.ratings.${field}`);
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm text-foreground/85">{label}</span>
      <div className="flex flex-1 justify-between gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={t("journal.rateAria", { field: label, n })}
            aria-pressed={value === n}
            // Tapping the chosen dot again clears it.
            onClick={() => onChange(value === n ? null : n)}
            className={`h-8 flex-1 rounded-full border text-xs transition-colors ${
              value !== null && n <= value ? "border-gold bg-gold/25 text-gold" : "border-gold/15 text-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function HighlightLine({ h }: { h: JournalHighlight }) {
  const { t } = useTranslation();
  const planet = (p: string) => t(`planetNames.${p.toLowerCase()}`);
  if (h.kind === "dashaEvents") {
    return (
      <p className="text-sm text-foreground/90">
        {t("journal.insights.dashaEvents", {
          count: h.count,
          area: t(`why.areas.${h.area}`),
          maha: planet(h.maha),
          antar: planet(h.antar),
        })}
      </p>
    );
  }
  return <p className="text-sm text-foreground/90">{t("journal.insights.taraMood", { good: h.good, bad: h.bad })}</p>;
}

function JournalPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { enabled: birthTimeOn } = useNewFeature("home.birthTimeConfidence");
  const [today, setToday] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [insights, setInsights] = useState<JournalInsights | null>(null);
  const [lifeEventCount, setLifeEventCount] = useState(0);

  const loadInsights = useCallback(() => {
    journalApi.insights().then(setInsights).catch(() => setInsights(null));
    journalApi
      .lifeEvents()
      .then((r) => setLifeEventCount(r.events.length))
      .catch(() => setLifeEventCount(0));
  }, []);

  useEffect(() => {
    journalApi
      .list()
      .then((res) => {
        setToday(res.today);
        setEntries(res.entries);
        setDate(res.today);
        setDraft(draftOf(res.entries.find((e) => e.date === res.today)));
      })
      .catch(() => setStatus("error"));
    loadInsights();
  }, [loadInsights]);

  function pickDate(next: string) {
    if (!next || (today && next > today)) return;
    setDate(next);
    setStatus("idle");
    const known = entries.find((e) => e.date === next);
    if (known) {
      setDraft(draftOf(known));
      return;
    }
    setDraft(EMPTY);
    // Older than the loaded window: fetch just that day.
    journalApi
      .list({ from: next, to: next })
      .then((res) => res.entries[0] && setDraft(draftOf(res.entries[0])))
      .catch(() => {});
  }

  function toggleEvent(d: RectifyDomain) {
    setDraft((prev) => {
      if (prev.events.includes(d)) return { ...prev, events: prev.events.filter((e) => e !== d) };
      if (prev.events.length >= MAX_EVENTS_PER_DAY) return prev;
      return { ...prev, events: [...prev.events, d] };
    });
  }

  async function save() {
    if (!date) return;
    setStatus("saving");
    try {
      const saved = await journalApi.save(date, { ...draft, note: draft.note.trim() || null });
      setEntries((prev) => [saved, ...prev.filter((e) => e.date !== date)].sort((a, b) => b.date.localeCompare(a.date)));
      setStatus("saved");
      loadInsights();
    } catch {
      setStatus("error");
    }
  }

  async function remove() {
    if (!date) return;
    try {
      await journalApi.remove(date);
      setEntries((prev) => prev.filter((e) => e.date !== date));
      setDraft(EMPTY);
      setStatus("idle");
      loadInsights();
    } catch {
      setStatus("error");
    }
  }

  const current = entries.find((e) => e.date === date);
  const planet = (p: string | null) => (p ? t(`planetNames.${p.toLowerCase()}`) : "—");

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display flex items-center gap-2">
              <BookHeart size={18} className="text-gold" />
              {t("journal.title")}
            </h1>
            <p className="text-[11px] text-muted">{t("journal.subtitle")}</p>
          </div>
        </div>

        {date && (
          <Card className="p-4 border-gold/15 space-y-4" data-testid="journal-checkin">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gold">
                {date === today ? t("journal.today") : dayLabel(date, i18n.language)}
              </span>
              <input
                type="date"
                aria-label={t("journal.dateLabel")}
                value={date}
                max={today ?? undefined}
                onChange={(e) => pickDate(e.target.value)}
                className="rounded-xl border border-gold/10 bg-transparent px-3 py-1.5 text-sm text-foreground"
              />
            </div>
            {current?.snapshot && (
              <p className="text-[11px] text-muted">
                {t("journal.sky", {
                  maha: planet(current.snapshot.maha),
                  antar: planet(current.snapshot.antar),
                  sign: t(`zodiac.signs.${current.snapshot.moonSign.toLowerCase()}`),
                  nakshatra: t(`nakshatraNames.${current.snapshot.moonNakshatra.toLowerCase()}`),
                })}
              </p>
            )}

            <div className="space-y-2.5">
              {RATING_FIELDS.map((f) => (
                <RatingRow key={f} field={f} value={draft[f]} onChange={(v) => setDraft((p) => ({ ...p, [f]: v }))} />
              ))}
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs text-muted">{t("journal.note")}</span>
              <textarea
                value={draft.note}
                onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value.slice(0, MAX_NOTE_LENGTH) }))}
                placeholder={t("journal.notePlaceholder")}
                rows={3}
                className="w-full resize-none rounded-2xl border px-4 py-3 text-base outline-none focus:border-yellow-500/60"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
              />
            </label>

            <div>
              <button
                type="button"
                onClick={() => setEventsOpen((o) => !o)}
                aria-expanded={eventsOpen}
                className="flex w-full items-center justify-between text-sm text-foreground/90"
              >
                <span>
                  {t("journal.events")}
                  {draft.events.length > 0 && <span className="ml-1.5 text-gold">({draft.events.length})</span>}
                </span>
                <ChevronDown size={16} className={`transition-transform ${eventsOpen ? "rotate-180" : ""}`} />
              </button>
              {eventsOpen && (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-muted">{t("journal.eventsHint")}</p>
                  {DOMAIN_GROUPS.map(({ group, options }) => (
                    <div key={group}>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">{t(`rectify.group.${group}`)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((d) => (
                          <button
                            key={d}
                            type="button"
                            aria-pressed={draft.events.includes(d)}
                            onClick={() => toggleEvent(d)}
                            className={`rounded-full border px-2.5 py-1 text-xs ${
                              draft.events.includes(d) ? "border-gold bg-gold/15 text-gold" : "border-gold/15 text-foreground/80"
                            }`}
                          >
                            {t(`rectify.domain.${d}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void save()}
              disabled={status === "saving"}
              className="w-full h-11 rounded-full bg-yellow-500 text-black text-sm font-semibold disabled:opacity-40"
            >
              {status === "saving" ? t("journal.saving") : status === "saved" ? t("journal.saved") : t("journal.save")}
            </button>
            {status === "error" && <p className="text-center text-xs text-rose-300">{t("journal.error")}</p>}
            {current && (
              <button type="button" onClick={() => void remove()} className="mx-auto flex items-center gap-1 text-[11px] text-muted">
                <Trash2 size={12} />
                {t("journal.delete")}
              </button>
            )}
          </Card>
        )}

        {insights && (
          <Card className="p-4 border-gold/10 space-y-3" data-testid="journal-insights">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("journal.insights.title")}</p>
              <span className="flex items-center gap-1 text-xs text-muted">
                {insights.streak > 0 && (
                  <>
                    <Flame size={12} className="text-orange-400" />
                    {t("journal.insights.streak", { count: insights.streak })} ·{" "}
                  </>
                )}
                {t("journal.insights.total", { count: insights.total })}
              </span>
            </div>
            {insights.highlights.length === 0 ? (
              <p className="text-xs text-muted">{t("journal.insights.none")}</p>
            ) : (
              insights.highlights.map((h) => <HighlightLine key={h.kind} h={h} />)
            )}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted">{t("journal.insights.averages")}</p>
              {RATING_FIELDS.map((f) => {
                const avg = insights.averages[f];
                return (
                  <div key={f} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 text-foreground/80">{t(`journal.ratings.${f}`)}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-gold/80" style={{ width: `${((avg ?? 0) / 5) * 100}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right text-muted">{avg ?? "—"}</span>
                  </div>
                );
              })}
            </div>
            {birthTimeOn && lifeEventCount >= 3 && (
              <Link href="/settings" className="block text-center text-xs font-medium text-gold underline underline-offset-2">
                {t("journal.birthTime", { count: lifeEventCount })}
              </Link>
            )}
            <p className="text-[10px] text-muted">{t("journal.insights.disclaimer")}</p>
          </Card>
        )}

        <div className="space-y-2 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("journal.history")}</p>
          {entries.length === 0 && <p className="text-xs text-muted">{t("journal.empty")}</p>}
          {entries.map((e) => (
            <button
              key={e.date}
              type="button"
              onClick={() => pickDate(e.date)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left ${
                e.date === date ? "border-gold/40 bg-gold/10" : "border-gold/10 bg-surface/50"
              }`}
            >
              <span className="w-16 shrink-0 text-xs text-foreground/85">{shortDate(e.date, i18n.language)}</span>
              <span className="flex gap-0.5" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`h-1.5 w-1.5 rounded-full ${e.mood !== null && n <= e.mood ? "bg-gold" : "bg-white/15"}`} />
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted">{e.note ?? ""}</span>
              {e.events.length > 0 && <span className="text-[10px] text-gold">★{e.events.length}</span>}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function JournalRoute() {
  return (
    <NewFeatureGuard featureKey="nav.journal">
      <JournalPage />
    </NewFeatureGuard>
  );
}
