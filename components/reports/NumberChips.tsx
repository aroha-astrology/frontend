"use client";

/**
 * A row of small pill chips for a flat number array (e.g. `luckyNumbers`, `keyHouses`) — see
 * `isNumberArray` in lib/report-score-facts.ts. Reads far better than the generic "nested" fact
 * type's numbered list ("1: 2, 2: 7, ...") for a value that's really just a set of numbers.
 */
export default function NumberChips({ values }: { values: number[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((n, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center min-w-[2rem] rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold"
        >
          {n}
        </span>
      ))}
    </div>
  );
}
