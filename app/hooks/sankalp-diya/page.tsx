"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import HookPage from "@/components/hooks/HookPage";
import { Notice, Section, useAction } from "@/components/hooks/atoms";
import { useHookView } from "@/hooks/useHookView";
import { codeMessage, inMinutes, price } from "@/lib/hooks-copy";
import { haptic, tick } from "@/lib/haptics";
import type { DiyaView } from "@/lib/hooks-types";

const HOLD_MS = 2000;
const OCCASION: Record<string, string> = { ekadashi: "Ekadashi", pradosh: "Pradosh", purnima: "Purnima", amavasya: "Amavasya" };

/** Hold the wick for two seconds. Works with a finger, a mouse and the keyboard (hold Enter or Space). */
function Wick({ onLit, disabled }: { onLit: () => void; disabled: boolean }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }, []);
  const start = useCallback(() => {
    if (timer.current !== null || disabled) return;
    setHolding(true);
    void tick(30);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      void haptic([30, 40, 60]);
      onLit();
    }, HOLD_MS);
  }, [onLit, disabled]);
  useEffect(() => cancel, [cancel]);
  return (
    <button
      type="button"
      data-testid="diya-wick"
      aria-label="Hold to light the diya"
      disabled={disabled}
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
      className="relative grid h-40 w-40 touch-none select-none place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold disabled:opacity-50"
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-center rounded-full bg-gold/25 transition-transform ease-linear"
        style={{ transform: `scale(${holding ? 1 : 0})`, transitionDuration: holding ? `${HOLD_MS}ms` : "150ms" }}
      />
      <Flame size={52} className="relative" />
    </button>
  );
}

export default function DiyaPage() {
  const { data, load, loadCode, reload, act } = useHookView<DiyaView>("hooks.sankalpDiya", "sankalp-diya");
  const { busy, msg, run } = useAction();

  return (
    <HookPage hook="sankalpDiya" load={load} loadCode={loadCode} reload={reload} hasData={Boolean(data)}>
      {data && (
        <>
          <Section title="Today's window" testId="diya-window">
            <p className="text-2xl font-display" data-testid="diya-times">
              {data.window.start} to {data.window.end}
            </p>
            <p className="mt-1 text-xs text-muted">{data.window.why}</p>
            {data.occasion && (
              <p className="mt-2 inline-block rounded-full border border-gold/30 px-3 py-0.5 text-xs text-gold" data-testid="diya-occasion">
                {OCCASION[data.occasion]} today{data.giftPaise > 0 ? ` · +${price(data.giftPaise)} when you light it` : ""}
              </p>
            )}
          </Section>

          <Section>
            <div className="flex flex-col items-center gap-3 py-2">
              {data.lit ? (
                <div className="text-center" data-testid="diya-lit">
                  <Flame size={56} className="mx-auto text-orange-400" />
                  <p className="mt-2 text-base font-semibold">Your diya is lit.</p>
                  {data.giftPaid && <p className="text-xs text-emerald-200">+{price(data.giftPaise)} added today.</p>}
                </div>
              ) : data.state === "open" ? (
                <>
                  <Wick
                    disabled={busy}
                    onLit={() => void run(() => act("sankalp-diya/light", {}), undefined, codeMessage)}
                  />
                  <p className="text-sm font-semibold">Hold the wick for 2 seconds</p>
                </>
              ) : data.state === "before" ? (
                <p className="text-sm text-muted" data-testid="diya-before">
                  The window opens {data.opensInMin !== null ? inMinutes(data.opensInMin) : "later today"}.
                </p>
              ) : (
                <p className="text-sm text-muted" data-testid="diya-closed">Today's window has passed. Tomorrow's opens in the morning.</p>
              )}
              <Notice text={msg?.text ?? null} tone={msg?.tone} />
            </div>
          </Section>

          <Section>
            <div className="flex items-center justify-between text-sm">
              <span data-testid="diya-streak">
                Streak: <b>{data.streak}</b> {data.streak === 1 ? "day" : "days"}
              </span>
              {data.litToday !== null && (
                <span className="text-muted" data-testid="diya-count">
                  {data.litToday.toLocaleString()} diyas lit today
                </span>
              )}
            </div>
          </Section>
        </>
      )}
    </HookPage>
  );
}
