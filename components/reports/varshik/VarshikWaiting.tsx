"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import ArtSlot from "./ArtSlot";
import ReportSurface from "./ReportSurface";
import { art } from "./assets";

/** The five groups the backend writes, in order (lib/llm/reports/varshik-2027.ts). */
const STEPS: { key: string; en: string }[] = [
  { key: "shape", en: "Reading your chart and the shape of your year" },
  { key: "areas", en: "Scoring your planets, seven areas and timing" },
  { key: "monthsA", en: "Writing the first months of your year" },
  { key: "monthsB", en: "Writing the last months of your year" },
  { key: "closing", en: "Writing your remedies and Baba Ji's letter" },
];

/**
 * The waiting screen for Varshik Rashifal 2027: the golden wheel (A46) turning slowly, and the
 * steps ticking off as the backend finishes each group. The progress is the real count the status
 * call returns, never a timer; with no count yet, no step is ticked and the first one is current.
 */
export default function VarshikWaiting({ progress }: { progress?: { done: number; total: number } }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const done = Math.max(0, Math.min(STEPS.length - 1, progress?.done ?? 0));
  return (
    <ReportSurface>
      <div className="flex min-w-0 flex-col items-center gap-5 text-center">
        <motion.div
          className="w-36"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={reduce ? undefined : { duration: 40, ease: "linear", repeat: Infinity }}
        >
          <ArtSlot kind="medallion" code="A46" src={art("A46")} />
        </motion.div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="vk-title m-0 break-words" style={{ fontSize: "1.5rem" }}>
            {t("varshik.waiting.title", { defaultValue: "Writing your year" })}
          </p>
          <p className="vk-caption m-0 break-words">
            {t("varshik.waiting.body", { defaultValue: "This takes a few minutes. You can leave this page; your report will be waiting." })}
          </p>
        </div>
        <ol className="m-0 flex w-full min-w-0 list-none flex-col gap-2 p-0 text-left" aria-label={t("varshik.waiting.steps", { defaultValue: "Progress" })}>
          {STEPS.map((s, i) => {
            const state = i < done ? "done" : i === done ? "now" : "next";
            return (
              <li key={s.key} className="flex min-w-0 items-start gap-3" aria-current={state === "now" ? "step" : undefined}>
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]"
                  style={{
                    borderColor: state === "next" ? "var(--border-faint)" : "var(--gold)",
                    background: state === "done" ? "var(--gold)" : "transparent",
                    color: state === "done" ? "var(--background)" : "var(--gold)",
                    boxShadow: state === "now" ? "0 0 10px var(--gold)" : "none",
                  }}
                >
                  {state === "done" ? "✓" : state === "now" ? "•" : ""}
                </span>
                <span className="vk-body min-w-0 break-words" style={{ color: state === "next" ? "var(--text-muted)" : "var(--foreground)" }}>
                  {t(`varshik.waiting.step.${s.key}`, { defaultValue: s.en })}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </ReportSurface>
  );
}
