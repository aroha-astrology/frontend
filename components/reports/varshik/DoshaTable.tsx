"use client";

import { useTranslation } from "react-i18next";
import { useY } from "./year-context";
import type { DoshaFact } from "./types";
import { TIER_COLOR, useChartMode } from "./tiers";
import { monthShort } from "./format";

const STATUS_EN = { present: "Present", cancelled: "Cancelled", not_present: "Not present" } as const;

/** The nine doshas (Gandanta is the ninth): status, the months of the year each is active, what it touches and the simple remedy. */
export default function DoshaTable({ doshas }: { doshas: DoshaFact[] }) {
  const { t, i18n } = useTranslation();
  const y = useY();
  const mode = useChartMode();
  if (doshas.length === 0) return null;
  const lang = i18n.language;

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0 leading-[1.45]">
      {doshas.map((d) => {
        // Calm colours: present is amber (to be aware of), cancelled is green, absent is muted.
        const color =
          d.status === "present" ? TIER_COLOR[mode].amber : d.status === "cancelled" ? TIER_COLOR[mode].light_green : "var(--text-muted)";
        const glyph = d.status === "present" ? "◑" : d.status === "cancelled" ? "✓" : "○";
        const active = new Set(d.activeMonths);
        const reasons = [...new Set(Object.values(d.because).flat())];
        return (
          <li
            key={d.key}
            className="flex flex-col gap-2 vk-panel p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <span className="vk-h3 min-w-0 break-words">
                {t(`varshik.dosha.${d.key}`, { defaultValue: d.label })}
              </span>
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: color, color }}>
                <span aria-hidden="true">{glyph} </span>
                {t(`varshik.dosha.status.${d.status}`, { defaultValue: STATUS_EN[d.status] })}
              </span>
            </div>

            {d.status === "cancelled" && d.cancellations.length > 0 ? (
              <p className="m-0 break-words text-xs" style={{ color: "var(--text-muted)" }}>
                {t("varshik.dosha.cancelledBy", {
                  defaultValue: "Cancelled because: {{reasons}}",
                  reasons: d.cancellations.join("; "),
                })}
              </p>
            ) : null}

            {d.status !== "not_present" ? (
              <>
                <div className="grid grid-cols-4 gap-1 min-[420px]:grid-cols-6 min-[560px]:grid-cols-12" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, m) => (
                    <div key={m} className="flex min-w-0 flex-col items-center gap-0.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ boxShadow: active.has(m) ? `0 0 8px ${color}` : "none", background: active.has(m) ? color : "transparent", border: `1px solid ${active.has(m) ? color : "var(--border-faint)"}` }}
                      />
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {monthShort(m, lang)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="m-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
                  {active.size > 0
                    ? t("varshik.dosha.activeIn", {
                        defaultValue: "Active in: {{months}}",
                        months: [...active].sort((a, b) => a - b).map((m) => monthShort(m, lang)).join(", "),
                      })
                    : y(t("varshik.dosha.quiet", { defaultValue: "Quiet through 2027" }))}
                </p>
                {reasons.length > 0 ? (
                  <p className="m-0 break-words text-xs" style={{ color: "var(--text-muted)" }}>
                    {reasons.join("; ")}
                  </p>
                ) : null}
              </>
            ) : null}

            <p className="m-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
              <span style={{ color: "var(--text-muted)" }}>{t("varshik.dosha.touches", { defaultValue: "Touches" })}: </span>
              {d.touches}
            </p>
            {d.status !== "not_present" ? (
              <p className="m-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
                <span style={{ color: "var(--text-muted)" }}>{t("varshik.dosha.remedy", { defaultValue: "Simple remedy" })}: </span>
                {d.remedy}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
