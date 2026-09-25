"use client";

import { useTranslation } from "react-i18next";
import { MessageCircleQuestion } from "lucide-react";
import Card from "@/components/ui/Card";
import type { KpQuestionView } from "@/lib/kp-annual-report-view";
import { AreaBadge, PromisePill, SectionTitle } from "./kp-visuals";
import { windowLabel } from "./KpLifeAreasCard";

/**
 * The reader's own questions, asked at purchase — each judged the KP way (the right cusp's
 * sub lord, then the year's dashas) and answered in the narrative. Renders nothing when the
 * reader skipped the step.
 */
export default function KpQuestionsCard({ questions }: { questions: KpQuestionView[] }) {
  const { t } = useTranslation();
  if (questions.length === 0) return null;
  return (
    <section>
      <SectionTitle>{t("kpAnnualReport.questions.title")}</SectionTitle>
      <div className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <Card key={i} className="rounded-2xl border-gold/25 p-3.5">
            <div className="flex items-start gap-2.5">
              <MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-gold" />
              <p className="font-display text-[15px] leading-snug text-foreground">“{q.question}”</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {q.topic !== "general" ? (
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <AreaBadge area={q.topic} size={22} />
                  {t(`kpAnnualReport.area.${q.topic}`)}
                </span>
              ) : (
                <span className="text-[11px] text-muted">{t("kpAnnualReport.area.general")}</span>
              )}
              <PromisePill promise={q.promise} label={t(`kpAnnualReport.promise.${q.promise}`)} />
              {q.bestWindow && (
                <span className="text-[11px] text-gold">
                  {t("kpAnnualReport.areas.bestWindow")} {windowLabel(q.bestWindow)}
                </span>
              )}
            </div>
            {q.answer && <p className="mt-3 text-sm leading-relaxed text-foreground/85">{q.answer}</p>}
          </Card>
        ))}
      </div>
    </section>
  );
}
