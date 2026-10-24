"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Share2, Sparkles } from "lucide-react";
import HookPage from "@/components/hooks/HookPage";
import { Notice, Pill, Section, useAction } from "@/components/hooks/atoms";
import { useHookView } from "@/hooks/useHookView";
import { codeMessage, inMinutes } from "@/lib/hooks-copy";
import { haptic } from "@/lib/haptics";
import type { MysteryView } from "@/lib/hooks-types";

const HOLD_MS = 1200;

/** Press and hold the card to scratch it. Also works with Enter or Space held down. */
function ScratchCard({ index, onDone, busy }: { index: number; onDone: () => void; busy: boolean }) {
  const [p, setP] = useState(0);
  const timer = useRef<number | null>(null);
  const t0 = useRef(0);
  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setP(0);
  };
  const start = () => {
    if (timer.current !== null || busy) return;
    t0.current = Date.now();
    timer.current = window.setInterval(() => {
      const frac = Math.min((Date.now() - t0.current) / HOLD_MS, 1);
      setP(frac);
      if (frac >= 1) {
        stop();
        void haptic([20, 30, 50]);
        onDone();
      }
    }, 40);
  };
  return (
    <button
      type="button"
      data-testid={`scratch-${index}`}
      aria-label="Hold to scratch the card"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") stop();
      }}
      className="relative grid h-40 w-full touch-none select-none place-items-center overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-violet-500/30 to-gold/20"
    >
      <span className="absolute inset-y-0 left-0 bg-black/30" style={{ width: `${p * 100}%` }} aria-hidden />
      <span className="relative flex flex-col items-center gap-1 text-gold">
        <Sparkles size={28} />
        <span className="text-sm font-semibold">Hold to scratch</span>
      </span>
    </button>
  );
}

export default function MysteryPage() {
  const { data, load, loadCode, reload, act } = useHookView<MysteryView>("hooks.mysteryDrop", "mystery");
  const { busy, msg, run } = useAction();

  const share = async (text: string) => {
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* closed */
    }
  };

  return (
    <HookPage hook="mysteryDrop" load={load} loadCode={loadCode} reload={reload} hasData={Boolean(data)}>
      {data && (
        <>
          {data.state === "waiting" && (
            <Section testId="mystery-waiting">
              <p className="text-sm">Tonight's card appears at 6 PM{data.opensInMin !== null ? ` (${inMinutes(data.opensInMin)})` : ""}.</p>
            </Section>
          )}
          {data.state === "empty" && (
            <Section testId="mystery-empty">
              <p className="text-sm text-muted">There is no card today. Check that your birth details are complete.</p>
            </Section>
          )}
          {data.cards.map((c) => (
            <Section key={c.index} testId={`mystery-card-${c.index}`}>
              {c.scratched ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-gold">{c.kind === "public" ? "A public chart" : "In your Circle"}</p>
                  <p className="text-xl font-display" data-testid={`mystery-name-${c.index}`}>{c.name}</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                    {c.why?.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <Pill tone="quiet" onClick={() => void share(`${c.name}: ${c.why?.join(". ")}.`)}>
                    <Share2 size={14} className="mr-1 inline" /> Share
                  </Pill>
                </div>
              ) : (
                <ScratchCard index={c.index} busy={busy} onDone={() => void run(() => act("mystery/scratch", { index: c.index }), undefined, codeMessage)} />
              )}
            </Section>
          ))}
          <Notice text={msg?.text ?? null} tone={msg?.tone} />
          {data.addFriendHint && (
            <Section>
              <p className="text-sm">This is a public chart because your Circle is empty. Add a friend, free, to see who in your own Circle lines up with you.</p>
              <Link href="/circles" className="mt-2 inline-block text-sm text-gold underline">
                Open your Circle
              </Link>
            </Section>
          )}
          {data.state === "ready" && data.allowed === 1 && <p className="text-xs text-muted">One card a day. A Pass gives you a second.</p>}
        </>
      )}
    </HookPage>
  );
}
