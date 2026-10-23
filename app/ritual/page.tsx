"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Flame, KeyRound, ShieldCheck, Sunrise } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import { useRitual } from "@/hooks/useRitual";
import { useExperience } from "@/hooks/useExperience";
import { haptic, tick } from "@/lib/haptics";
import { skinToLook } from "@/lib/experience";
import { formatCoins } from "@/lib/money";
import {
  BREATH_COUNT,
  BREATH_IN_MS,
  BREATH_OUT_MS,
  HAPTIC,
  JAP_COUNT,
  MOODS,
  prashnaKeys,
  prashnaRef,
  SEAL_HOLD_MS,
  type RitualPractice,
  type RitualResult,
} from "@/lib/ritual";

type Step = "seal" | "card" | "practice" | "mood" | "done";

/** Hold-to-begin. Works with a finger, a mouse and the keyboard (hold Enter or Space). */
function Seal({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (timer.current !== null) return;
    setHolding(true);
    void tick(HAPTIC.sealStart);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      void tick(HAPTIC.sealDone);
      onDone();
    }, SEAL_HOLD_MS);
  }, [onDone]);

  useEffect(() => cancel, [cancel]);

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <button
        type="button"
        data-testid="ritual-seal"
        aria-label={t("ritual.hold")}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter" || e.key === " ") cancel();
        }}
        className="relative grid h-44 w-44 touch-none select-none place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold"
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-gold/25 origin-center transition-transform ease-linear"
          style={{ transform: `scale(${holding ? 1 : 0})`, transitionDuration: holding ? `${SEAL_HOLD_MS}ms` : "150ms" }}
        />
        <Sunrise size={56} className="relative" />
      </button>
      <p className="text-base font-semibold text-foreground">{holding ? t("ritual.holding") : t("ritual.hold")}</p>
      <p className="text-xs text-muted">{t("ritual.holdHint")}</p>
    </div>
  );
}

function Jap({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [n, setN] = useState(0);
  const done = n >= JAP_COUNT;
  return (
    <div className="flex flex-col items-center gap-4 py-6" data-testid="ritual-jap">
      <p className="text-xs text-muted">{t("ritual.japHint")}</p>
      <button
        type="button"
        data-testid="ritual-bead"
        disabled={done}
        onClick={() => {
          void tick(HAPTIC.jap);
          setN((c) => Math.min(JAP_COUNT, c + 1));
        }}
        className="grid h-36 w-36 place-items-center rounded-full border border-gold/40 bg-gold/10 text-3xl font-display text-gold disabled:opacity-60"
      >
        {n}
      </button>
      <p className="text-sm text-foreground/90" data-testid="ritual-jap-count">
        {done ? t("ritual.japDone", { total: JAP_COUNT }) : t("ritual.japCount", { n, total: JAP_COUNT })}
      </p>
      <button
        type="button"
        data-testid="ritual-practice-next"
        disabled={!done}
        onClick={onDone}
        className="h-11 w-full rounded-full bg-gold/20 text-sm font-semibold text-gold disabled:opacity-40"
      >
        {t("ritual.next")}
      </button>
    </div>
  );
}

function Breath({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [breath, setBreath] = useState(1);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!started || finished) return;
    void tick(HAPTIC.breath);
    const timer = window.setTimeout(
      () => {
        if (phase === "in") {
          setPhase("out");
        } else if (breath >= BREATH_COUNT) {
          setFinished(true);
        } else {
          setBreath((b) => b + 1);
          setPhase("in");
        }
      },
      phase === "in" ? BREATH_IN_MS : BREATH_OUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [started, finished, phase, breath]);

  return (
    <div className="flex flex-col items-center gap-4 py-6" data-testid="ritual-breath">
      {!started ? (
        <button
          type="button"
          data-testid="ritual-breath-start"
          onClick={() => setStarted(true)}
          className="h-11 w-full rounded-full bg-gold/20 text-sm font-semibold text-gold"
        >
          {t("ritual.breathStart")}
        </button>
      ) : (
        <>
          <span
            aria-hidden
            className="grid h-36 w-36 place-items-center rounded-full border border-gold/40 bg-gold/10 transition-transform ease-in-out"
            style={{
              transform: `scale(${finished ? 1 : phase === "in" ? 1.25 : 0.85})`,
              transitionDuration: `${phase === "in" ? BREATH_IN_MS : BREATH_OUT_MS}ms`,
            }}
          />
          <p className="text-lg font-semibold text-foreground" data-testid="ritual-breath-phase">
            {finished ? t("ritual.doneTitle") : phase === "in" ? t("ritual.breathIn") : t("ritual.breathOut")}
          </p>
          <p className="text-xs text-muted">{t("ritual.breathCount", { n: breath, total: BREATH_COUNT })}</p>
        </>
      )}
      <button
        type="button"
        data-testid="ritual-practice-next"
        disabled={!finished}
        onClick={onDone}
        className="h-11 w-full rounded-full bg-gold/20 text-sm font-semibold text-gold disabled:opacity-40"
      >
        {t("ritual.next")}
      </button>
    </div>
  );
}

function RitualPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { today, load, reload, complete } = useRitual();
  const { info: experience } = useExperience();
  const look = skinToLook(experience?.skin ?? null);

  const [step, setStep] = useState<Step>("seal");
  const [practice, setPractice] = useState<RitualPractice | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [result, setResult] = useState<RitualResult | null>(null);

  // Opening the page after the ritual is done goes straight to the summary.
  useEffect(() => {
    if (today?.completed && step !== "done") setStep("done");
  }, [today?.completed, step]);

  async function finish() {
    if (!practice || mood === null || saving) return;
    setSaving(true);
    setSaveFailed(false);
    const res = await complete(practice, mood);
    setSaving(false);
    if (!res) {
      setSaveFailed(true);
      return;
    }
    void haptic(HAPTIC.finish);
    setResult(res);
    setStep("done");
  }

  const ref = today ? prashnaRef(today.cardIndex) : null;
  const keys = ref ? prashnaKeys(look, ref) : null;
  const theme = keys ? t(keys.theme) : "";
  const streak = result?.streak ?? today?.streak ?? null;

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 page-container pt-8 space-y-4 page-cols">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="flex-1 text-lg font-display flex items-center gap-2">
            <Sunrise size={18} className="text-gold" />
            {t("ritual.title")}
          </h1>
          {streak && streak.run > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Flame size={12} className="text-orange-400" />
              {t("ritual.homeStreak", { n: streak.run })}
            </span>
          )}
        </div>

        {load === "failed" && !today && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted">{t("ritual.loadFailed")}</p>
            <button type="button" onClick={reload} className="h-10 rounded-full border border-gold/25 px-5 text-sm">
              {t("ritual.retry")}
            </button>
          </div>
        )}

        {!today && load !== "failed" && <p className="py-10 text-center text-sm text-muted">…</p>}

        {today && step === "seal" && <Seal onDone={() => setStep("card")} />}

        {today && step === "card" && ref && keys && (
          <Card className="p-5 border-gold/30 space-y-3" data-testid="ritual-prashna">
            <p className="text-xs uppercase tracking-wider text-gold">{t("ritual.cardLabel")}</p>
            <p className="text-[11px] text-muted" data-testid="ritual-pada">
              {t("ritual.padaLine", {
                nakshatra: t(`nakshatraNames.${ref.nakshatraKey}`),
                pada: ref.pada,
                lens: t(keys.lensLabel),
              })}
            </p>
            <p className="text-xl font-display text-foreground first-letter:uppercase" data-testid="ritual-theme">
              {theme}
            </p>
            <p className="text-base leading-relaxed text-foreground/90" data-testid="ritual-question">
              {t(keys.question, { theme })}
            </p>
            <p className="text-[11px] text-muted">{t(today.basis === "moonAndLagna" ? "ritual.basisLagna" : "ritual.basisMoon")}</p>
            <button
              type="button"
              data-testid="ritual-card-next"
              onClick={() => setStep("practice")}
              className="h-11 w-full rounded-full bg-gold/20 text-sm font-semibold text-gold"
            >
              {t("ritual.next")}
            </button>
          </Card>
        )}

        {today && step === "practice" && (
          <Card className="p-5 border-gold/20 space-y-3" data-testid="ritual-practice">
            <p className="text-sm font-semibold text-foreground">{t("ritual.practiceTitle")}</p>
            {practice === null ? (
              <div className="grid grid-cols-2 gap-3">
                {(["jap", "breath"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    data-testid={`ritual-pick-${p}`}
                    onClick={() => setPractice(p)}
                    className="h-20 rounded-2xl border border-gold/25 bg-gold/10 text-sm font-semibold text-gold"
                  >
                    {t(`ritual.${p}`)}
                  </button>
                ))}
              </div>
            ) : practice === "jap" ? (
              <Jap onDone={() => setStep("mood")} />
            ) : (
              <Breath onDone={() => setStep("mood")} />
            )}
          </Card>
        )}

        {today && step === "mood" && (
          <Card className="p-5 border-gold/20 space-y-4" data-testid="ritual-mood">
            <p className="text-sm font-semibold text-foreground">{t("ritual.moodTitle")}</p>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`ritual-mood-${m}`}
                  aria-pressed={mood === m}
                  onClick={() => setMood(m)}
                  className={`flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] ${
                    mood === m ? "border-gold bg-gold/20 text-gold" : "border-gold/20 text-foreground/80"
                  }`}
                >
                  <span className="text-lg font-semibold">{m}</span>
                  {t(`ritual.mood${m}`)}
                </button>
              ))}
            </div>
            {saveFailed && <p className="text-xs text-red-300">{t("ritual.saveFailed")}</p>}
            <button
              type="button"
              data-testid="ritual-finish"
              disabled={mood === null || saving}
              onClick={() => void finish()}
              className="h-11 w-full rounded-full bg-gold/20 text-sm font-semibold text-gold disabled:opacity-40"
            >
              {saving ? t("ritual.saving") : t("ritual.finish")}
            </button>
          </Card>
        )}

        {today && step === "done" && streak && (
          <Card className="p-5 border-emerald-500/30 space-y-3" data-testid="ritual-done">
            <p className="flex items-center gap-2 text-base font-semibold text-emerald-200">
              <Check size={18} />
              {t("ritual.doneTitle")}
            </p>
            {result?.alreadyDone && <p className="text-xs text-muted">{t("ritual.alreadyDone")}</p>}
            <p className="text-sm text-foreground/90" data-testid="ritual-streak">
              {t("ritual.doneStreak", { n: streak.run })}
              {result && result.rewardPaise > 0 && <span className="ml-2 text-gold">+{formatCoins(result.rewardPaise)}</span>}
            </p>
            {result?.earned.key && (
              <p className="flex items-center gap-2 text-sm text-gold" data-testid="ritual-key-earned">
                <KeyRound size={16} />
                {t("ritual.keyEarned")}
              </p>
            )}
            {result?.earned.shield && (
              <p className="flex items-center gap-2 text-sm text-gold" data-testid="ritual-shield-earned">
                <ShieldCheck size={16} />
                {t("ritual.shieldEarned")}
              </p>
            )}
            {result?.earned.shieldCoveredDate && (
              <p className="text-xs text-muted" data-testid="ritual-shield-used">
                {t("ritual.shieldUsed", { date: result.earned.shieldCoveredDate })}
              </p>
            )}
            <div className="flex gap-4 text-xs text-muted">
              <span>{t("ritual.keys", { n: streak.cosmicKeys })}</span>
              <span>{t("ritual.shields", { n: streak.shields })}</span>
            </div>
            <p className="text-[11px] text-muted">{t("ritual.nextKey", { n: streak.nextKeyInDays })}</p>
            <p className="text-[11px] text-muted">{t("ritual.nextShield", { n: streak.nextShieldInDays })}</p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="h-11 w-full rounded-full border border-gold/25 text-sm text-foreground/90"
            >
              {t("ritual.back")}
            </button>
          </Card>
        )}
      </div>
    </main>
  );
}

export default function RitualRoute() {
  return (
    <NewFeatureGuard featureKey="ritual.morning">
      <RitualPage />
    </NewFeatureGuard>
  );
}
