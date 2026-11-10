"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, MapPin } from "lucide-react";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import { api, type PlaceOfBirth, type UpdateMeBody } from "@/lib/api";
import { track } from "@/lib/analytics";
import type { BirthGap } from "@/lib/varshik-birth";

type Phase = "ask" | "saving" | "updating" | "ready" | "slow";

const nap = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Varshik Rashifal reads the year chart, whose rising sign moves about every two hours, so it is sold only
 * on a birth time the reader calls exact and a birth place with coordinates. This card sits at the top of
 * the purchase sheet and asks for exactly what is missing (one gap at a time), saves it on the reader's
 * profile, then waits for the Kundli to be rebuilt from it: the report is written from that new chart
 * (the server refuses the purchase with CHART_UPDATING until it exists, so this wait is what the reader sees).
 *
 * Saving never uses the one lifetime birth-detail edit: confirming a time, replacing a part-of-day window
 * with a real time, and filling a blank field are all free on the server (users.service updateMe).
 */
export default function VarshikBirthConfirm({
  gaps,
  savedTime,
  profileId,
  worldwide,
  waitToken,
  onSaved,
  onReadyChange,
  onLeaveForCheck,
}: {
  gaps: BirthGap[];
  /** The saved time, HH:mm, for "is this exact?". */
  savedTime: string | null;
  /** 'primary' for the account owner, else the saved profile's id. */
  profileId: string;
  worldwide: boolean;
  /** Bump it to wait for the chart again (the server answered CHART_UPDATING). */
  waitToken: number;
  /** Re-reads the user and profiles so `gaps` follows the save. */
  onSaved: () => Promise<void>;
  /** False while a gap is open or the chart is being rebuilt: the Buy button waits on it. */
  onReadyChange: (ready: boolean) => void;
  /** Keep the half-filled sheet before going to the birth time check. */
  onLeaveForCheck: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("ask");
  const [error, setError] = useState(false);
  const [unsure, setUnsure] = useState(false);
  const [time, setTime] = useState("");
  const [timeIsExact, setTimeIsExact] = useState(false);
  const [place, setPlace] = useState<PlaceOfBirth | null>(null);
  const waiting = useRef(false);
  const gap = gaps[0] ?? null;
  const timeGap = gap === "time_missing" || gap === "time_window" || gap === "time_unconfirmed";

  /** Polls the Kundli until the rebuilt one is ready. The first look waits a moment so the rebuild has started. */
  const waitForChart = async () => {
    if (waiting.current) return;
    waiting.current = true;
    setPhase("updating");
    onReadyChange(false);
    try {
      await nap(1500);
      const k = await api.pollKundli({ timeoutMs: 90_000 });
      setPhase(k.status === "ready" ? "ready" : "slow");
    } catch {
      setPhase("slow");
    } finally {
      waiting.current = false;
      // "slow": the server still checks the chart at purchase, so Buy may be tried; it explains if it must wait.
      onReadyChange(true);
    }
  };

  // No gap left and nothing being saved: the sheet may sell. A new gap (or one still open) holds it.
  useEffect(() => {
    if (gap) onReadyChange(false);
    else if (phase === "ask") onReadyChange(true);
  }, [gap, phase, onReadyChange]);

  // The server said the chart is still being rebuilt: wait for it here.
  useEffect(() => {
    if (waitToken > 0) void waitForChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitToken]);

  const save = async (body: Pick<UpdateMeBody, "timeOfBirth" | "birthTimeAccuracy"> & { placeOfBirth?: PlaceOfBirth }) => {
    setError(false);
    setPhase("saving");
    try {
      if (profileId === "primary") await api.updateMe(body);
      else await api.updateBirthProfile(profileId, body);
      track("varshik_birth_confirmed", { gap: gap ?? "none" });
      await onSaved();
      setTime("");
      setTimeIsExact(false);
      setPlace(null);
      setUnsure(false);
      // Every save changes the chart's inputs (accuracy is one of them), so the Kundli is rebuilt.
      await waitForChart();
    } catch {
      setError(true);
      setPhase("ask");
    }
  };

  const goToCheck = () => {
    onLeaveForCheck();
    track("varshik_birth_check_opened", { gap: gap ?? "none" });
    router.push("/settings#birth-time");
  };

  if (!gap && phase === "ask") return null;

  const shell = "flex flex-col gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-3.5 py-3.5";
  const primaryBtn = "rounded-full bg-gold px-4 py-2.5 text-xs font-bold text-[#1a0e00] disabled:opacity-50";
  const quietBtn = "rounded-full border border-gold/30 px-4 py-2.5 text-xs font-medium text-foreground/85";
  const field = "w-full h-12 rounded-2xl px-4 outline-none border text-base focus:border-yellow-500/60";
  const fieldStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

  if (phase === "saving" || phase === "updating") {
    return (
      <div className={shell} role="status" data-testid="varshik-birth-updating">
        <GeneratingSpinner label={t(phase === "saving" ? "varshik.birthConfirm.saving" : "varshik.birthConfirm.updating")} size={28} />
      </div>
    );
  }

  if (!gap) {
    return (
      <p
        className="flex items-start gap-2 rounded-2xl border border-gold/25 bg-gold/5 px-3.5 py-3 text-xs leading-relaxed text-foreground/90"
        role="status"
        data-testid="varshik-birth-ready"
      >
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
        <span>{t(phase === "slow" ? "varshik.birthConfirm.slow" : "varshik.birthConfirm.ready")}</span>
      </p>
    );
  }

  return (
    <div className={shell} data-testid="varshik-birth-confirm" data-gap={gap}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
        {timeGap ? <Clock size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}
        {t("varshik.birthConfirm.title")}
      </p>
      <p className="text-xs leading-relaxed text-foreground/90">{t(timeGap ? "varshik.birthConfirm.whyTime" : "varshik.birthConfirm.whyPlace")}</p>

      {gap === "time_unconfirmed" && !unsure && (
        <>
          <p className="text-sm font-semibold text-foreground">{t("varshik.birthConfirm.isExact", { time: savedTime ?? "" })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} onClick={() => void save({ birthTimeAccuracy: "exact" })}>
              {t("varshik.birthConfirm.yesExact")}
            </button>
            <button type="button" className={quietBtn} onClick={() => setUnsure(true)}>
              {t("varshik.birthConfirm.notSure")}
            </button>
          </div>
        </>
      )}

      {(gap === "time_missing" || gap === "time_window") && (
        <>
          <label className="ml-1 text-xs text-muted" htmlFor="varshik-birth-time">
            {t("varshik.birthConfirm.enterTime")}
          </label>
          <input
            id="varshik-birth-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={field}
            style={fieldStyle}
          />
          <label className="flex cursor-pointer items-start gap-2.5 px-1 text-xs leading-relaxed text-foreground/85">
            <input type="checkbox" checked={timeIsExact} onChange={(e) => setTimeIsExact(e.target.checked)} className="mt-0.5" />
            <span>{t("varshik.birthConfirm.confirmExact")}</span>
          </label>
          <button
            type="button"
            className={primaryBtn}
            disabled={!time || !timeIsExact}
            onClick={() => void save({ timeOfBirth: time, birthTimeAccuracy: "exact" })}
          >
            {t("varshik.birthConfirm.saveTime")}
          </button>
        </>
      )}

      {gap === "place_missing" && (
        <>
          <PlaceAutocomplete
            placeholder={t("varshik.birthConfirm.placePlaceholder")}
            inputClassName={field}
            inputStyle={fieldStyle}
            worldwide={worldwide}
            onSelect={setPlace}
          />
          <button type="button" className={primaryBtn} disabled={!place} onClick={() => place && void save({ placeOfBirth: place })}>
            {t("varshik.birthConfirm.savePlace")}
          </button>
        </>
      )}

      {error && <p className="text-[11px] text-red-400">{t("varshik.birthConfirm.saveError")}</p>}

      {timeGap && (
        <div
          className={`mt-1 flex flex-col gap-2 rounded-xl border px-3 py-3 ${unsure ? "border-gold/50 bg-background/40" : "border-gold/15 bg-background/20"}`}
          data-testid="varshik-birth-check"
        >
          <p className="text-xs font-semibold text-foreground">{t("varshik.birthConfirm.checkTitle")}</p>
          <p className="text-xs leading-relaxed text-foreground/80">{t("varshik.birthConfirm.checkBody")}</p>
          <button type="button" className={`${quietBtn} self-start`} onClick={goToCheck}>
            {t("varshik.birthConfirm.checkCta")}
          </button>
          <p className="text-[11px] leading-relaxed text-muted">{t("varshik.birthConfirm.checkKept")}</p>
          {unsure && (
            <button type="button" className="self-start text-[11px] text-gold underline underline-offset-2" onClick={() => setUnsure(false)}>
              {t("varshik.birthConfirm.backToExact")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
