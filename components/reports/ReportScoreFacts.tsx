"use client";

import { useTranslation } from "react-i18next";
import { buildScoreFacts, SCORE_FACT_LABEL_KEYS, type ScoreFact, type NestedEntry } from "@/lib/report-score-facts";
import TimingWindowsCard from "./TimingWindowsCard";
import AgeBandTable from "./AgeBandTable";
import ArchetypeCard from "./ArchetypeCard";
import DecadeArcCard from "./DecadeArcCard";
import DoshaYogaPanel from "./DoshaYogaPanel";
import GunaKootaBreakdown from "./GunaKootaBreakdown";
import LifeContextCard from "./LifeContextCard";
import ReportGemstonesCard from "./ReportGemstonesCard";

/** The 5 fact types the original 2-column tile grid renders — unchanged since before the bespoke shapes were added. */
type SimpleFact = Extract<ScoreFact, { type: "ring" | "badge" | "boolean" | "nested" | "raw" }>;
/** The 6 bespoke fact types, each rendered full-width by a dedicated component instead of a small grid tile. */
type RichFact = Extract<
  ScoreFact,
  {
    type:
      | "timingWindows"
      | "ageBands"
      | "archetype"
      | "decadeArc"
      | "doshaYoga"
      | "kootaBreakdown"
      | "lifeContext"
      | "gemstones";
  }
>;
type NestedFact = Extract<ScoreFact, { type: "nested" }>;
type RawFact = Extract<ScoreFact, { type: "raw" }>;

function isSimpleFact(f: ScoreFact): f is SimpleFact {
  return f.type === "ring" || f.type === "badge" || f.type === "boolean" || f.type === "nested" || f.type === "raw";
}

/**
 * A `nested` fact's `entries[].display` values come straight out of
 * `formatNestedValue` (lib/report-score-facts.ts), which joins whole nested
 * objects into long "A: x · B: y · C: <a full sentence>"-style strings — so
 * a nested fact can legitimately be much longer than the other 4 simple fact
 * types. Past this combined-length threshold it reads poorly squeezed into a
 * half-width grid tile, so it's promoted to a full-width row instead
 * (matching the treatment richFacts already get below the grid) rather than
 * clipping or squashing report content the user paid for.
 *
 * Counts BOTH `label` and `display` length — a fact can have short values but
 * long labels (e.g. "Modern Realities": "Seventh House Planet Count" paired
 * with a trivial "1"/"✗" value). Counting only `display` let that case slip
 * under the threshold into a half-width tile, where the rigid, non-wrapping
 * label (see `NestedEntryRows` below) overflowed the card and the viewport.
 */
const NESTED_FACT_FULL_WIDTH_THRESHOLD = 40;

function nestedFactCombinedLength(f: NestedFact): number {
  return f.entries.reduce((total, e) => total + e.label.length + e.display.length, 0);
}

export function isLongNestedFact(f: ScoreFact): f is NestedFact {
  return f.type === "nested" && nestedFactCombinedLength(f) > NESTED_FACT_FULL_WIDTH_THRESHOLD;
}

/**
 * Same promotion as `isLongNestedFact`, for a top-level `raw` fact (e.g. marriage's
 * seventhHouseTemperament, a full sentence rather than a short enum — see
 * `isProseValue` in report-score-facts.ts, which is what routes it to `raw` instead
 * of a title-cased `badge` in the first place).
 */
export function isLongRawFact(f: ScoreFact): f is RawFact {
  return f.type === "raw" && f.label.length + f.value.length > NESTED_FACT_FULL_WIDTH_THRESHOLD;
}

/** Shared label/value row markup for a `nested` fact's entries — used by both the grid-tile and full-width-row renderings so the overflow handling (min-w-0 + break-words, see the module doc comment) lives in exactly one place. */
function NestedEntryRows({ entries }: { entries: NestedEntry[] }) {
  return (
    <>
      {entries.map((e, i) =>
        e.prose ? (
          <div key={i} className="flex flex-col gap-1 text-[11px]">
            <span className="text-muted">{e.label}</span>
            <span className="text-foreground/80 leading-relaxed">{e.display}</span>
          </div>
        ) : (
          <div key={i} className="flex justify-between gap-2 text-[11px] text-foreground/80">
            <span className="shrink-0 max-w-[45%] break-words text-muted">{e.label}</span>
            <span className="min-w-0 flex-1 text-right break-words">{e.display}</span>
          </div>
        ),
      )}
    </>
  );
}

/**
 * Generic renderer for a report's `scores` payload — see
 * lib/report-score-facts.ts's doc comment for why this is one generic
 * renderer instead of 10 bespoke visualizations. Renders nothing if `scores`
 * is empty/absent/malformed rather than an empty grid.
 *
 * The original 5 fact types (ring/badge/boolean/nested/raw) still render in
 * the same 2-column tile grid, byte-for-byte unchanged, EXCEPT a `nested` or
 * `raw` fact whose text is long (see `NESTED_FACT_FULL_WIDTH_THRESHOLD`
 * above): that gets promoted to a full-width row alongside the richFacts
 * instead of being squeezed/title-cased into a half-width tile. The 5 newer
 * enrichment shapes
 * (timingWindows/ageBands/archetype/decadeArc/doshaYoga) are richer than a
 * small tile can hold, so they render as full-width sections below the grid
 * instead, each delegating to its own component.
 */
export default function ReportScoreFacts({ scores }: { scores: Record<string, unknown> | null | undefined }) {
  const { t } = useTranslation();
  const facts = buildScoreFacts(scores);
  if (facts.length === 0) return null;

  // Falls back to the raw humanizeKey() label (already carried on `f.label`)
  // for any key not yet in the dictionary — keys are backend/LLM-controlled
  // and not fully enumerable, see report-score-facts.ts's doc comment.
  const labelFor = (f: ScoreFact) => {
    const i18nKey = SCORE_FACT_LABEL_KEYS[f.key];
    return i18nKey ? t(i18nKey) : f.label;
  };

  const gridFacts = facts.filter(
    (f): f is SimpleFact => isSimpleFact(f) && !isLongNestedFact(f) && !isLongRawFact(f),
  );
  const longNestedFacts = facts.filter(isLongNestedFact);
  const longRawFacts = facts.filter(isLongRawFact);
  const richFacts = facts.filter((f): f is RichFact => !isSimpleFact(f));

  return (
    <div className="flex flex-col gap-4">
      {gridFacts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {gridFacts.map((f) => (
            <div key={f.key} className="rounded-2xl border border-gold/15 bg-card p-3 flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-muted break-words">{labelFor(f)}</span>

              {f.type === "ring" && <ScoreRing value={f.value} max={f.max} pct={f.pct} />}

              {f.type === "badge" && <span className="text-sm font-semibold text-gold break-words">{f.value}</span>}

              {f.type === "boolean" && (
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    f.value ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {f.value ? t("common.yes") : t("common.no")}
                </span>
              )}

              {f.type === "nested" && (
                <div className="flex flex-col gap-0.5">
                  <NestedEntryRows entries={f.entries} />
                </div>
              )}

              {f.type === "raw" && <span className="text-sm text-foreground">{f.value}</span>}
            </div>
          ))}
        </div>
      )}

      {longNestedFacts.map((f) => (
        <div key={f.key} className="rounded-2xl border border-gold/15 bg-card p-3 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted break-words">{labelFor(f)}</span>
          <div className="flex flex-col gap-0.5">
            <NestedEntryRows entries={f.entries} />
          </div>
        </div>
      ))}

      {longRawFacts.map((f) => (
        <div key={f.key} className="rounded-2xl border border-gold/15 bg-card p-3 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted break-words">{labelFor(f)}</span>
          <p className="text-sm text-foreground/90 leading-relaxed">{f.value}</p>
        </div>
      ))}

      {richFacts.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted">{labelFor(f)}</span>

          {f.type === "timingWindows" && <TimingWindowsCard windows={f.windows} />}
          {f.type === "ageBands" && <AgeBandTable bands={f.bands} />}
          {f.type === "archetype" && <ArchetypeCard archetype={f.archetype} />}
          {f.type === "decadeArc" && <DecadeArcCard bands={f.bands} />}
          {f.type === "doshaYoga" && <DoshaYogaPanel summary={f.summary} />}
          {f.type === "kootaBreakdown" && <GunaKootaBreakdown entries={f.entries} />}
          {f.type === "lifeContext" && <LifeContextCard lifeContext={f.value} />}
          {f.type === "gemstones" && <ReportGemstonesCard gemstones={f.gemstones} />}
        </div>
      ))}
    </div>
  );
}

export function ScoreRing({ value, max, pct }: { value: number; max: number; pct: number }) {
  const color = pct >= 66 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-10 h-10 rounded-full grid place-items-center shrink-0"
        style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(120,120,120,0.18) 0deg)` }}
      >
        <div className="w-7 h-7 rounded-full bg-card grid place-items-center">
          <span className="text-[9px] font-bold text-foreground">{pct}%</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-foreground">
        {value}/{max}
      </span>
    </div>
  );
}
