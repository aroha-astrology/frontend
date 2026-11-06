"use client";

import { useTranslation } from "react-i18next";
import type { VarshaYear } from "./types";

const pct = (v: number) => `${Math.max(0, Math.min(100, (v / 20) * 100))}%`;

/** The Panchadhikari office-bearers of the Varsha year with strength meters, then Panchavargi bars. */
export default function PanchadhikariTable({ year }: { year: VarshaYear }) {
  const { t } = useTranslation();
  const planetWord = (p: string) => t(`varshik.planet.${p.toLowerCase()}`, { defaultValue: p });
  const sorted = Object.entries(year.panchavargi).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-5 leading-[1.45]">
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {year.panchadhikari.map((row) => {
          const isLord = row.planet === year.yearLord;
          return (
            <li
              key={`${row.role}-${row.planet}`}
              className="flex items-start gap-3 rounded-xl border border-[color:var(--border-faint)] p-3"
              style={{
                background: "var(--card)",
                borderLeft: isLord ? "3px solid var(--gold)" : undefined,
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {planetWord(row.planet)}
                  </span>
                  {isLord ? (
                    <span
                      className="rounded-full border px-2 text-xs"
                      style={{ borderColor: "var(--gold)", color: "var(--gold)" }}
                    >
                      {t("varshik.panchadhikari.yearLord", { defaultValue: "Year Lord" })}
                    </span>
                  ) : null}
                </div>
                <span className="min-w-0 break-words text-xs" style={{ color: "var(--text-muted)" }}>
                  {t(`varshik.role.${row.role}`, { defaultValue: row.role })}
                </span>
                {row.aspectsLagna ? (
                  <span className="min-w-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
                    <span aria-hidden="true">✓ </span>
                    {t("varshik.panchadhikari.aspectsLagna", { defaultValue: "Sees the Lagna" })}
                  </span>
                ) : null}
              </div>
              <div className="flex w-24 shrink-0 flex-col gap-1">
                <span className="text-right text-sm tabular-nums" style={{ color: "var(--foreground)" }}>
                  {row.strength.toFixed(1)}
                </span>
                <div className="h-1.5 w-full rounded-full" style={{ background: "var(--border-faint)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: pct(row.strength), background: "var(--gold)" }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {sorted.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <h3 className="m-0 min-w-0 break-words text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {t("varshik.panchavargi.title", { defaultValue: "Five-fold strength of the planets" })}
          </h3>
          {sorted.map(([planet, value]) => (
            <div key={planet} className="flex items-center gap-3">
              <span className="w-24 shrink-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
                {planetWord(planet)}
              </span>
              <div className="h-2 flex-1 rounded-full" style={{ background: "var(--border-faint)" }}>
                <div
                  className="h-full"
                  style={{
                    width: pct(value),
                    background: "var(--gold)",
                    borderRadius: "0 999px 999px 0",
                  }}
                />
              </div>
              <span className="w-10 text-right text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                {value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
