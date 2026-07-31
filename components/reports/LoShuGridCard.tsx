"use client";

import { useTranslation } from "react-i18next";
import type { LoShuGridValue } from "@/lib/report-score-facts";

/**
 * The classical Lo Shu magic-square digit positions — a fixed constant (never varies per user),
 * matching jyotish-backend's own `GRID_TEMPLATE` in numerology/vedic.ts. Kept here (not sent over
 * the wire) purely to label which digit each `cells[r][c]` count belongs to — same
 * recompute-a-fixed-constant-client-side precedent as the divisional-chart carousel.
 */
const GRID_TEMPLATE = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];

/** Renders the 3×3 Lo Shu grid (digit + how many times it appears in the DOB) plus the digits
 * missing from the DOB entirely — replaces the generic nested-fact renderer's flattened
 * "1, 2, 0, 1, 0, 1, 0, 2, 0" string with the actual grid shape. */
export default function LoShuGridCard({ value }: { value: LoShuGridValue }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-gold/15 bg-card p-3">
        {GRID_TEMPLATE.map((row, r) =>
          row.map((digit, c) => {
            const count = value.cells[r]?.[c] ?? 0;
            return (
              <div
                key={`${r}-${c}`}
                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 aspect-square ${
                  count > 0 ? "border-gold/25 bg-gold/10" : "border-dashed border-border/50"
                }`}
              >
                <span className={`text-lg font-bold ${count > 0 ? "text-gold" : "text-muted/50"}`}>{digit}</span>
                <span className="text-[10px] text-muted">{count > 0 ? digit.toString().repeat(count) : "—"}</span>
              </div>
            );
          }),
        )}
      </div>

      {value.missing.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {t("reports.facts.numerology.missingDigits")}
          </span>
          <div className="flex flex-wrap gap-2">
            {value.missing.map((d) => (
              <span
                key={d}
                className="inline-flex items-center justify-center min-w-[1.75rem] rounded-full border border-dashed border-border/50 px-2 py-1 text-xs font-medium text-muted"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
