"use client";

import { useTranslation } from "react-i18next";
import type { YogaFact } from "./types";
import { monthShort } from "./format";
import { usePdfCapturing } from "@/components/pdf/PdfCapturingContext";

const initial = (s: string) => {
  try {
    return new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)[Symbol.iterator]().next().value?.segment ?? s.charAt(0);
  } catch {
    return s.charAt(0);
  }
};

/** Yogas on your side: natal and Tajika yogas, each with the months of 2027 it delivers. */
export default function YogaList({ yogas }: { yogas: YogaFact[] }) {
  const { t, i18n } = useTranslation();
  const sheet = usePdfCapturing();
  if (yogas.length === 0) return null;
  const lang = i18n.language;
  const groups: { source: YogaFact["source"]; en: string }[] = [
    { source: "natal", en: "From your birth chart" },
    { source: "tajika", en: "From your Varsha charts" },
  ];

  return (
    <div className="flex flex-col gap-5 leading-[1.45]">
      {groups.map(({ source, en }) => {
        const all = yogas.filter((y) => y.source === source);
        if (all.length === 0) return null;
        // On the printed sheet only yogas with a month to act in get a row; the rest go into one quiet line.
        const rows = sheet ? all.filter((y) => y.months.length > 0) : all;
        const quiet = sheet ? all.filter((y) => y.months.length === 0) : [];
        const label = (y: YogaFact) => `${y.name}${y.targetYear && !y.name.includes(String(y.targetYear)) ? ` ${y.targetYear}` : ""}`;
        if (sheet) {
          return (
            <section key={source} className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-semibold" style={{ color: "var(--gold)" }}>{t(`varshik.yoga.group.${source}`, { defaultValue: en })}</h3>
              <ul className="m-0 flex list-none flex-col gap-1 p-0" data-vk-flow data-vk-maxcols="2">
                {rows.map((y, i) => {
                  const active = new Set(y.months);
                  return (
                    <li key={`${y.name}-${y.targetYear ?? "n"}-${i}`} className="flex items-center justify-between gap-3" style={{ borderBottom: "1px solid var(--border-faint)", paddingBottom: 3 }}>
                      <span className="min-w-0 break-words">
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{label(y)}</span>
                        {y.planets.length > 0 && y.source !== "tajika" ? (
                          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                            {y.planets.map((p) => t(`varshik.planet.${p.toLowerCase()}`, { defaultValue: p })).join(" · ")}
                          </span>
                        ) : null}
                      </span>
                      <span className="grid shrink-0 grid-cols-12 gap-[3px]" aria-hidden="true">
                        {Array.from({ length: 12 }, (_, m) => (
                          <span key={m} className="flex w-[11px] flex-col items-center gap-[2px]">
                            <span style={{ fontSize: 9, lineHeight: 1, color: active.has(m) ? "var(--gold)" : "var(--text-muted)" }}>{initial(monthShort(m, lang))}</span>
                            <span
                              className="h-[9px] w-[9px] rounded-full"
                              style={{ background: active.has(m) ? "var(--gold)" : "transparent", border: `1px solid ${active.has(m) ? "var(--gold)" : "var(--border-faint)"}`, boxShadow: active.has(m) ? "0 0 6px var(--gold)" : "none" }}
                            />
                          </span>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {quiet.length > 0 ? (
                <p className="m-0 break-words" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {t("varshik.yoga.quiet", { defaultValue: "Also in the chart, with no month that stands out:" })} {quiet.map(label).join("; ")}.
                </p>
              ) : null}
            </section>
          );
        }
        return (
          <section key={source} className="flex flex-col gap-2.5">
            <h3 className="m-0 min-w-0 break-words text-sm font-semibold" style={{ color: "var(--gold)" }}>
              {t(`varshik.yoga.group.${source}`, { defaultValue: en })}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0" data-vk-flow>
              {rows.map((y, i) => {
                const active = new Set(y.months);
                return (
                  <li
                    key={`${y.name}-${y.targetYear ?? "n"}-${i}`}
                    className="vk-yoga-card flex flex-col gap-1.5 vk-panel p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="vk-h3 min-w-0 break-words">
                        {y.name}
                        {y.targetYear && !y.name.includes(String(y.targetYear)) ? ` ${y.targetYear}` : ""}
                      </span>
                      {y.planets.length > 0 ? (
                        <span className="min-w-0 break-words text-xs" style={{ color: "var(--text-muted)" }}>
                          {y.planets.map((p) => t(`varshik.planet.${p.toLowerCase()}`, { defaultValue: p })).join(" · ")}
                        </span>
                      ) : null}
                    </div>
                    <div className="vk-yoga-dots grid grid-cols-4 gap-1 min-[420px]:grid-cols-6 min-[560px]:grid-cols-12" aria-hidden="true">
                      {Array.from({ length: 12 }, (_, m) => (
                        <div key={m} className="flex min-w-0 flex-col items-center gap-0.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              boxShadow: active.has(m) ? "0 0 8px var(--gold)" : "none",
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
                    <p className={`m-0 break-words text-xs ${active.size > 0 ? "vk-yoga-delivers" : ""}`} style={{ color: "var(--foreground)" }}>
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
