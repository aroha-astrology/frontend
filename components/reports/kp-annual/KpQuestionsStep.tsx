"use client";

import { useTranslation } from "react-i18next";
import { HeartHandshake, MessageCircleQuestion, ShieldAlert } from "lucide-react";
import { KP_QUESTION_IDS, KP_QUESTION_MAX_CHARS } from "@/lib/report-questions";
import type { QuestionCheckResult } from "@/lib/reports-api";

export type KpQuestions = Record<(typeof KP_QUESTION_IDS)[number], string>;

export const EMPTY_KP_QUESTIONS: KpQuestions = { question1: "", question2: "", question3: "" };

/** The non-empty questions, in order, paired with the id each travels under. */
export function filledKpQuestions(q: KpQuestions): Array<{ id: (typeof KP_QUESTION_IDS)[number]; text: string }> {
  return KP_QUESTION_IDS.map((id) => ({ id, text: q[id].trim() })).filter((x) => x.text.length > 0);
}

/**
 * The "ask your own questions" step of the KP Year Ahead purchase sheet: up to three
 * free-text questions the report will answer. `blocked` holds the server's verdicts for any
 * question the content policy refused (death, lifespan, self-harm) keyed by question id — a
 * self-harm question shows a helpline in a calm card, never an error tone.
 */
export default function KpQuestionsStep({
  value,
  onChange,
  blocked,
}: {
  value: KpQuestions;
  onChange: (next: KpQuestions) => void;
  blocked: Partial<Record<(typeof KP_QUESTION_IDS)[number], QuestionCheckResult>>;
}) {
  const { t } = useTranslation();
  // Reveal the next box once the previous one has something in it — three empty boxes up
  // front read like a form to fill, one inviting box reads like a conversation.
  const visible = KP_QUESTION_IDS.filter((id, i) => i === 0 || value[KP_QUESTION_IDS[i - 1]!].trim() !== "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-2xl border border-gold/20 bg-gold/[0.05] p-3">
        <MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-gold" />
        <div>
          <p className="text-sm font-semibold text-foreground">{t("kpAnnualReport.ask.title")}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{t("kpAnnualReport.ask.intro")}</p>
        </div>
      </div>

      {visible.map((id, i) => {
        const verdict = blocked[id];
        return (
          <div key={id} className="flex flex-col gap-1.5">
            <label htmlFor={`kp-${id}`} className="ml-1 text-xs text-muted">
              {t("kpAnnualReport.ask.label", { n: i + 1 })}
            </label>
            <textarea
              id={`kp-${id}`}
              rows={2}
              maxLength={KP_QUESTION_MAX_CHARS}
              value={value[id]}
              onChange={(e) => onChange({ ...value, [id]: e.target.value })}
              placeholder={t(`kpAnnualReport.ask.placeholder${i + 1}`)}
              className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition-colors focus:border-yellow-500/60 ${
                verdict?.topic === "death" ? "border-red-400/70" : ""
              }`}
              style={{
                background: "var(--surface)",
                borderColor: verdict?.topic === "death" ? undefined : "var(--border)",
                color: "var(--foreground)",
              }}
            />
            {verdict?.topic === "death" && (
              <p className="ml-1 flex items-start gap-1.5 text-[11px] leading-snug text-red-300">
                <ShieldAlert size={12} className="mt-px shrink-0" />
                {t("kpAnnualReport.ask.deathBlocked")}
              </p>
            )}
            {verdict?.topic === "suicide" && (
              <div className="flex items-start gap-2 rounded-xl border border-sky-400/30 bg-sky-400/[0.07] p-2.5 text-[12px] leading-relaxed text-sky-100">
                <HeartHandshake size={16} className="mt-0.5 shrink-0 text-sky-300" />
                <span>{verdict.message}</span>
              </div>
            )}
          </div>
        );
      })}

      <p className="ml-1 text-[10px] leading-relaxed text-muted">{t("kpAnnualReport.ask.policy")}</p>
    </div>
  );
}
