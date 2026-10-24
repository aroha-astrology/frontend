"use client";

import { Share2 } from "lucide-react";
import Link from "next/link";
import HookPage from "@/components/hooks/HookPage";
import { Notice, Pill, Section, useAction } from "@/components/hooks/atoms";
import { useHookView } from "@/hooks/useHookView";
import { codeMessage } from "@/lib/hooks-copy";
import { haptic } from "@/lib/haptics";
import type { KavachView } from "@/lib/hooks-types";

const QUALITY: Record<string, string> = { poor: "a day that could use some care", average: "an ordinary day", good: "a good day", excellent: "a very good day" };

/** Seven steps of the Kalash filling, as dots. */
function Kalash({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Kalash ${level} of 7`} data-testid="kalash" data-level={level}>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={`h-3 w-3 rounded-full ${i < level ? "bg-gold" : "bg-gold/15"}`} />
      ))}
    </div>
  );
}

export default function KavachPage() {
  const { data, load, loadCode, reload, act } = useHookView<KavachView>("hooks.gharKavach", "ghar-kavach");
  const { busy, msg, run } = useAction();

  const bead = async (count: number) => {
    void haptic(15);
    await run(() => act("ghar-kavach/beads", { count }), undefined, codeMessage);
  };

  const share = async (text: string) => {
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* the reader closed the share sheet */
    }
  };

  return (
    <HookPage hook="gharKavach" load={load} loadCode={loadCode} reload={reload} hasData={Boolean(data)}>
      {data && (
        <>
          {data.state === "empty" && (
            <Section testId="kavach-empty">
              <p className="text-sm">Add a family member to your Cosmic Circle with a birth date and time, and each morning one of them will be picked here.</p>
              <Link href="/circles" className="mt-3 inline-block text-sm text-gold underline">
                Open your Circle
              </Link>
            </Section>
          )}

          {data.today && (
            <Section title="Today's pick" testId="kavach-today">
              <p className="text-xl font-display" data-testid="kavach-name">{data.today.name}</p>
              <p className="mt-1 text-sm text-muted">
                Their {data.today.taraName} Tara today: {QUALITY[data.today.quality] ?? data.today.quality}. A short chant is a kind thing to do.
              </p>
              <div className="mt-3 rounded-2xl border border-gold/20 bg-gold/5 p-3">
                <p className="text-sm">
                  Chant <b>{data.today.beadsTarget} beads</b> for <b>{data.today.planetHindi}</b> ({data.today.planet})
                </p>
                <p className="mt-1 text-xs italic text-muted">{data.today.mantra}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm" data-testid="kavach-beads">
                  {data.today.beads} / {data.today.beadsTarget} beads
                </span>
                {!data.today.done && (
                  <Pill disabled={busy} testId="kavach-bead" onClick={() => void bead(1)}>
                    One bead
                  </Pill>
                )}
              </div>
              {!data.today.done && (
                <div className="mt-2">
                  <Pill tone="quiet" disabled={busy} testId="kavach-all" onClick={() => void bead(data.today!.beadsTarget - data.today!.beads)}>
                    I chanted all {data.today.beadsTarget}
                  </Pill>
                </div>
              )}
              <div className="mt-2">
                <Notice text={msg?.text ?? null} tone={msg?.tone} />
              </div>
            </Section>
          )}

          {data.today?.done && data.blessing && (
            <Section title="Blessing" testId="kavach-blessing">
              <p className="text-base">{data.blessing.text}</p>
              <div className="mt-3">
                <Pill tone="quiet" onClick={() => void share(data.blessing!.text)}>
                  <Share2 size={14} className="mr-1 inline" /> Share
                </Pill>
              </div>
            </Section>
          )}

          <Section title="The Kalash">
            <Kalash level={data.kalash} />
            <p className="mt-2 text-xs text-muted" data-testid="kavach-streak">
              {data.streak} {data.streak === 1 ? "day" : "days"} in a row. Seven days in a row unlock a free weekly family summary.
            </p>
          </Section>

          {data.summary?.unlocked && (
            <Section title="This week for your family" testId="kavach-summary">
              <ul className="space-y-1 text-sm">
                {data.summary.days.map((d) => (
                  <li key={d.date} className="flex justify-between">
                    <span>{d.date.slice(5)} · {d.name}</span>
                    <span className="text-muted">{d.taraName}{d.done ? " ✓" : ""}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </HookPage>
  );
}
