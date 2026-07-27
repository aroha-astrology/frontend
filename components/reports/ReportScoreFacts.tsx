"use client";

import { useTranslation } from "react-i18next";
import { buildScoreFacts, type ScoreFact, type NestedEntry } from "@/lib/report-score-facts";
import TimingWindowsCard from "./TimingWindowsCard";
import AgeBandTable from "./AgeBandTable";
import ArchetypeCard from "./ArchetypeCard";
import DecadeArcCard from "./DecadeArcCard";
import DoshaYogaPanel from "./DoshaYogaPanel";

/** The 5 fact types the original 2-column tile grid renders — unchanged since before the bespoke shapes were added. */
type SimpleFact = Extract<ScoreFact, { type: "ring" | "badge" | "boolean" | "nested" | "raw" }>;
/** The 5 bespoke fact types, each rendered full-width by a dedicated component instead of a small grid tile. */
type RichFact = Extract<
  ScoreFact,
  { type: "timingWindows" | "ageBands" | "archetype" | "decadeArc" | "doshaYoga" }
>;
type NestedFact = Extract<ScoreFact, { type: "nested" }>;

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
 */
const NESTED_FACT_FULL_WIDTH_THRESHOLD = 40;

function nestedFactCombinedLength(f: NestedFact): number {
  return f.entries.reduce((total, e) => total + e.display.length, 0);
}

function isLongNestedFact(f: ScoreFact): f is NestedFact {
  return f.type === "nested" && nestedFactCombinedLength(f) > NESTED_FACT_FULL_WIDTH_THRESHOLD;
}

/** Shared label/value row markup for a `nested` fact's entries — used by both the grid-tile and full-width-row renderings so the overflow handling (min-w-0 + break-words, see the module doc comment) lives in exactly one place. */
function NestedEntryRows({ entries }: { entries: NestedEntry[] }) {
  return (
    <>
      {entries.map((e, i) => (
        <div key={i} className="flex justify-between gap-2 text-[11px] text-foreground/80">
          <span className="text-muted shrink-0">{e.label}</span>
          <span className="text-right break-words min-w-0">{e.display}</span>
        </div>
      ))}
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
 * the same 2-column tile grid, byte-for-byte unchanged, EXCEPT a `nested`
 * fact whose combined entry text is long (see
 * `NESTED_FACT_FULL_WIDTH_THRESHOLD` above): that gets promoted to a
 * full-width row alongside the richFacts instead of being squeezed into a
 * half-width tile. The 5 newer enrichment shapes
 * (timingWindows/ageBands/archetype/decadeArc/doshaYoga) are richer than a
 * small tile can hold, so they render as full-width sections below the grid
 * instead, each delegating to its own component.
 */
export default function ReportScoreFacts({ scores }: { scores: Record<string, unknown> | null | undefined }) {
  const { t } = useTranslation();
  const facts = buildScoreFacts(scores);
  if (facts.length === 0) return null;

  const gridFacts = facts.filter((f): f is SimpleFact => isSimpleFact(f) && !isLongNestedFact(f));
  const longNestedFacts = facts.filter(isLongNestedFact);
  const richFacts = facts.filter((f): f is RichFact => !isSimpleFact(f));

  return (
    <div className="flex flex-col gap-4">
      {gridFacts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {gridFacts.map((f) => (
            <div key={f.key} className="rounded-2xl border border-gold/15 bg-card p-3 flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-muted truncate">{f.label}</span>

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
          <span className="text-[10px] uppercase tracking-wider text-muted truncate">{f.label}</span>
          <div className="flex flex-col gap-0.5">
            <NestedEntryRows entries={f.entries} />
          </div>
        </div>
      ))}

      {richFacts.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted">{f.label}</span>

          {f.type === "timingWindows" && <TimingWindowsCard windows={f.windows} />}
          {f.type === "ageBands" && <AgeBandTable bands={f.bands} />}
          {f.type === "archetype" && <ArchetypeCard archetype={f.archetype} />}
          {f.type === "decadeArc" && <DecadeArcCard bands={f.bands} />}
          {f.type === "doshaYoga" && <DoshaYogaPanel summary={f.summary} />}
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
