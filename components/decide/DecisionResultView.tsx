"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarCheck, Clock, MessageCircle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Card from "@/components/ui/Card";
import type { DecisionResult } from "@/lib/decisions-api";
import type { WhyFactor } from "@/lib/insights-api";
import { effectKey, whyFactorText } from "@/lib/why-format";
import { shortDate, monthHeading } from "@/lib/calendar-format";
import { askAboutDate, categoryKey, dayLabel, slotName, stripByMonth, TONE_CLASS } from "@/lib/decision-format";

function FactorList({ factors }: { factors: WhyFactor[] }) {
  const { t, i18n } = useTranslation();
  return (
    <ul className="space-y-1.5">
      {factors.map((f, i) => {
        const Icon = f.effect > 0 ? TrendingUp : f.effect < 0 ? TrendingDown : Minus;
        const tone = f.effect > 0 ? "text-emerald-400" : f.effect < 0 ? "text-amber-400" : "text-muted";
        return (
          <li key={i} className="flex gap-2 text-xs leading-snug text-foreground/85">
            <Icon size={13} className={`${tone} shrink-0 mt-0.5`} aria-label={t(effectKey(f.effect))} />
            <span>{whyFactorText(t, f, i18n.language)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** One Decision or Find My Date result (roadmap step 6). Rendered the same whether just bought or reopened. */
export default function DecisionResultView({ result }: { result: DecisionResult }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const subtitle = result.kind === "decision" ? result.question : result.place.name;

  return (
    <div className="space-y-4" data-testid="decision-result">
      <Card className="p-4 border-gold/15 space-y-1">
        <p className="text-sm font-semibold text-gold">{t(categoryKey(result.kind, result.category))}</p>
        {subtitle && <p className="text-sm text-foreground/85">{subtitle}</p>}
        <p className="text-[11px] text-muted">
          {t("decide.result.range", { from: shortDate(result.from, lang), to: shortDate(result.to, lang) })}
        </p>
        {result.approximateBirthTime && result.personal && (
          <p className="pt-1 text-[11px] text-amber-300/90">{t("decide.approximate")}</p>
        )}
        {!result.personal && <p className="pt-1 text-[11px] text-amber-300/90">{t("decide.panchangOnly")}</p>}
      </Card>

      <Card className="p-4 border-gold/10 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("decide.result.strip")}</p>
        {stripByMonth(result.days).map((m) => (
          <div key={m.month}>
            <p className="mb-1 text-[10px] text-muted">{monthHeading(m.month, lang)}</p>
            {/* One column per day of the month, so the same date lines up across months. */}
            <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-[3px]">
              {m.days.map((d, i) => (
                <span
                  key={d.date}
                  title={`${dayLabel(d.date, lang)} · ${t(`decide.result.legend.${d.tone}`)}`}
                  style={i === 0 ? { gridColumnStart: Number(d.date.slice(8)) } : undefined}
                  className={`h-4 rounded-[3px] ${TONE_CLASS[d.tone]}`}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-3 pt-1 text-[10px] text-muted">
          {(["good", "neutral", "caution"] as const).map((tone) => (
            <span key={tone} className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-sm ${TONE_CLASS[tone]}`} />
              {t(`decide.result.legend.${tone}`)}
            </span>
          ))}
        </div>
      </Card>

      {result.kind === "decision" && (
        <Card className="p-4 border-gold/10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("decide.result.windows")}</p>
          {result.windows.length === 0 ? (
            <p className="text-xs text-muted">{t("decide.result.noWindows")}</p>
          ) : (
            result.windows.map((w) => (
              <div key={`${w.start}-${w.tone}`} className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_CLASS[w.tone]}`} />
                <span className="flex-1 text-foreground/90">
                  {t(w.tone === "good" ? "decide.result.windowGood" : "decide.result.windowCaution")}
                </span>
                <span className="text-xs text-muted">
                  {t("decide.result.range", { from: shortDate(w.start, lang), to: shortDate(w.end, lang) })}
                </span>
              </div>
            ))
          )}
        </Card>
      )}

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
          <CalendarCheck size={14} />
          {t("decide.result.best")}
        </p>
        {result.best.length === 0 && <p className="text-xs text-muted">{t("decide.result.noBest")}</p>}
        {result.best.map((b) => (
          <Card key={b.date} className="p-4 border-emerald-500/20 space-y-2" data-testid="best-date">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-base font-semibold text-foreground">{dayLabel(b.date, lang)}</p>
              <span className="text-xs font-semibold text-emerald-400">{t("decide.result.score", { score: b.score })}</span>
            </div>
            {b.time && (
              <p className="flex items-center gap-1.5 text-xs text-foreground/85">
                <Clock size={12} className="text-gold" />
                {t("decide.result.bestTime", { name: slotName(t, b.time.name), start: b.time.start, end: b.time.end })}
              </p>
            )}
            {b.rahuKaal && (
              <p className="text-[11px] text-muted">
                {t("decide.result.avoidRahu", { start: b.rahuKaal.start, end: b.rahuKaal.end })}
              </p>
            )}
            <FactorList factors={b.why.slice(0, 4)} />
            <Link
              href={`/ai-chat?q=${encodeURIComponent(askAboutDate(t, result.kind, result.category, b.date, lang))}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gold"
            >
              <MessageCircle size={12} />
              {t("decide.result.ask")}
            </Link>
          </Card>
        ))}
      </div>

      {result.caution.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <AlertTriangle size={14} />
            {t("decide.result.caution")}
          </p>
          <Card className="p-4 border-amber-500/15 space-y-3">
            {result.caution.map((c) => (
              <div key={c.date} className="space-y-1">
                <p className="text-sm font-medium text-foreground">{dayLabel(c.date, lang)}</p>
                <FactorList factors={c.why.filter((f) => f.effect < 0).slice(0, 2)} />
              </div>
            ))}
          </Card>
        </div>
      )}

      <p className="pb-2 text-center text-[10px] text-muted">{t("decide.guidance")}</p>
    </div>
  );
}
