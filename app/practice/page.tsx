"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Flame, Sparkles } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import FactorList from "@/components/why/FactorList";
import ChantRing from "@/components/shlokas/ChantRing";
import { AUDIO_BASE, loadShlokas, pick, type Shloka } from "@/lib/shlokas";
import { practiceApi, type PracticeItem, type PracticeToday } from "@/lib/practice-api";
import { lalKitabLines, practiceItemTitle } from "@/lib/practice-format";
import type { LangCode } from "@/providers/language-provider";

function ItemCard({
  item,
  date,
  shloka,
  done,
  onDone,
}: {
  item: PracticeItem;
  date: string;
  shloka: Shloka | undefined;
  done: boolean;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as LangCode;
  const [open, setOpen] = useState(false);

  return (
    <Card className={`p-4 space-y-2 ${done ? "border-emerald-500/30" : "border-gold/15"}`} data-testid={`practice-item-${item.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{practiceItemTitle(t, item, lang)}</p>
          {shloka && (
            <p className="text-xs text-muted">
              {pick(shloka.title, lang)}
              {item.japCount ? ` · ${t("practice.japs", { count: item.japCount })}` : ""}
            </p>
          )}
        </div>
        {done && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
            <Check size={12} />
            {t("practice.done")}
          </span>
        )}
      </div>

      {item.reason && <p className="text-xs leading-relaxed text-foreground/85">{item.reason}</p>}
      {item.why.length > 0 && <FactorList factors={item.why} />}
      {item.kind === "action" && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
          {lalKitabLines(t, item).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        {item.kind === "chant" && shloka && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex-1 h-10 rounded-full bg-gold/20 text-sm font-semibold text-gold"
          >
            {open ? t("practice.hide") : t("practice.chant")}
          </button>
        )}
        {!done && (
          <button
            type="button"
            onClick={onDone}
            className="flex-1 h-10 rounded-full border border-gold/25 text-sm text-foreground/85"
          >
            {t("practice.markDone")}
          </button>
        )}
      </div>

      {open && shloka && (
        <div className="pt-2">
          <ChantRing
            chantKey={`practice:${date}:${item.id}`}
            sanskrit={shloka.sanskrit}
            audioSrc={shloka.audio ? `${AUDIO_BASE}${shloka.audio}` : null}
            defaultTarget={item.japCount ?? shloka.japCount}
            targetOverride={item.japCount}
            onComplete={done ? undefined : onDone}
          />
        </div>
      )}
    </Card>
  );
}

function PracticePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [today, setToday] = useState<PracticeToday | null>(null);
  const [error, setError] = useState(false);
  const [shlokas, setShlokas] = useState<Map<string, Shloka>>(new Map());

  useEffect(() => {
    practiceApi.today().then(setToday).catch(() => setError(true));
    loadShlokas()
      .then((list) => setShlokas(new Map(list.map((s) => [s.slug, s]))))
      .catch(() => {});
  }, []);

  function markDone(item: PracticeItem) {
    practiceApi
      .complete(item.id)
      .then(setToday)
      .catch(() => {});
  }

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display flex items-center gap-2">
              <Sparkles size={18} className="text-gold" />
              {t("practice.title")}
            </h1>
            <p className="text-[11px] text-muted">{t("practice.subtitle")}</p>
          </div>
        </div>

        {error && <p className="py-10 text-center text-sm text-muted">{t("practice.error")}</p>}
        {!error && !today && <p className="py-10 text-center text-sm text-muted">{t("practice.loading")}</p>}

        {today && (
          <>
            <Card className="p-4 border-gold/10 space-y-2" data-testid="practice-summary">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/90">
                  {today.done.length === today.items.length
                    ? t("practice.completed")
                    : t("practice.progress", { done: today.done.length, total: today.items.length })}
                </span>
                {today.streak > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Flame size={12} className="text-orange-400" />
                    {t("practice.streak", { count: today.streak })}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5" aria-hidden>
                {today.week.map((d) => (
                  <span key={d.date} className={`h-2 flex-1 rounded-full ${d.done > 0 ? "bg-gold/80" : "bg-white/10"}`} />
                ))}
              </div>
              <p className="text-[11px] text-muted">{t("practice.month", { count: today.monthDays })}</p>
            </Card>

            {today.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                date={today.date}
                shloka={item.slug ? shlokas.get(item.slug) : undefined}
                done={today.done.includes(item.id)}
                onDone={() => markDone(item)}
              />
            ))}
          </>
        )}
      </div>
    </main>
  );
}

export default function PracticeRoute() {
  return (
    <NewFeatureGuard featureKey="nav.dailyPractice">
      <PracticePage />
    </NewFeatureGuard>
  );
}
