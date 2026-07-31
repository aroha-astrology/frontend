"use client";

import { useTranslation } from "react-i18next";
import type { ForecastRow } from "@/lib/report-score-facts";

export interface ForecastColumn {
  key: string;
  labelKey: string;
}

/**
 * Generic scrollable table for a flat array of rows (e.g. `monthlyForecast`, `yearlyForecast`,
 * `challengeNumbers.phases`) — column set is caller-supplied so this stays reusable across the
 * numerology-specific shapes instead of one bespoke table per shape. Horizontally scrolls its own
 * container rather than the page, matching this app's convention for wide tabular content on a
 * narrow phone screen.
 */
export default function ForecastTable({ rows, columns }: { rows: ForecastRow[]; columns: ForecastColumn[] }) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-2xl border border-gold/15 bg-card">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gold/15">
            {columns.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-3 py-2 text-left font-medium uppercase tracking-wider text-[10px] text-muted">
                {t(c.labelKey)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-3 py-2 text-foreground/90">
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
