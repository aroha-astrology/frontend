"use client";

import { useTranslation } from "react-i18next";
import type { YogaFact } from "./types";
import { monthShort } from "./format";

/** Yogas on your side: natal and Tajika yogas, each with the months of 2027 it delivers. */
export default function YogaList({ yogas }: { yogas: YogaFact[] }) {
  const { t, i18n } = useTranslation();
  if (yogas.length === 0) return null;
  const lang = i18n.language;
  const groups: { source: YogaFact["source"]; en: string }[] = [
    { source: "natal", en: "From your birth chart" },
    { source: "tajika", en: "From your Varsha charts" },
  ];

  return (
    <div className="flex flex-col gap-5 leading-[1.45]">
      {groups.map(({ source, en }) => {
        const rows = yogas.filter((y) => y.source === source);
        if (rows.length === 0) return null;
        return (
          <section key={source} className="flex flex-col gap-2.5">
            <h3 className="m-0 min-w-0 break-words text-sm font-semibold" style={{ color: "var(--gold)" }}>
              {t(`varshik.yoga.group.${source}`, { defaultValue: en })}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {rows.map((y, i) => {
                const active = new Set(y.months);
                return (
                  <li
                    key={`${y.name}-${y.targetYear ?? "n"}-${i}`}
                    className="flex flex-col gap-1.5 rounded-xl border border-[color:var(--border-faint)] p-3"
                    style={{ background: "var(--card)" }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="min-w-0 break-words text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        {y.name}
                        {y.targetYear && !y.name.includes(String(y.targetYear)) ? ` ${y.targetYear}` : ""}
                      </span>
                      {y.planets.length > 0 ? (
                        <span className="min-w-0 break-words text-xs" style={{ color: "var(--text-muted)" }}>
                          {y.planets.map((p) => t(`varshik.planet.${p.toLowerCase()}`, { defaultValue: p })).join(" · ")}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-4 gap-1 min-[420px]:grid-cols-6 min-[560px]:grid-cols-12" aria-hidden="true">
                      {Array.from({ length: 12 }, (_, m) => (
                        <div key={m} className="flex min-w-0 flex-col items-center gap-0.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              background: active.has(m) ? "var(--gold)" : "transparent",
                              border: `1px solid ${active.has(m) ? "var(--gold)" : "var(--border-faint)"}`,
                            }}
                          />
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {monthShort(m, lang)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="m-0 break-words text-xs" style={{ color: "var(--foreground)" }}>
                      {active.size > 0
                        ? t("varshik.yoga.delivers", {
                            defaultValue: "Delivers in: {{months}}",
                            months: [...active].sort((a, b) => a - b).map((m) => monthShort(m, lang)).join(", "),
                          })
                        : (y.reason ?? t("varshik.yoga.noMonths", { defaultValue: "Present in the chart; no month stands out" }))}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
