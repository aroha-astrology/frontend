"use client";

import { useState } from "react";
import { Coins, Share2 } from "lucide-react";
import HookPage from "@/components/hooks/HookPage";
import { Notice, Pill, Section, useAction } from "@/components/hooks/atoms";
import { useHookView } from "@/hooks/useHookView";
import { clockOf, codeMessage, price } from "@/lib/hooks-copy";
import type { ReceiptPart, ReceiptsView, Verdict } from "@/lib/hooks-types";

const PART_LABEL: Record<ReceiptPart, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const VERDICTS: { v: Verdict; label: string }[] = [
  { v: "nailed", label: "Nailed" },
  { v: "partly", label: "Partly" },
  { v: "missed", label: "Missed" },
];

/** A share card drawn on a canvas: the three headlines and the reader's own marks. No accuracy figure. */
async function shareImage(view: ReceiptsView): Promise<void> {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext("2d");
  if (!g) return;
  g.fillStyle = "#14122b";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#b9a7ff";
  g.font = "bold 56px sans-serif";
  g.fillText("Cosmic Receipts", 70, 120);
  g.fillStyle = "#e9e6ff";
  g.font = "34px sans-serif";
  g.fillText(view.date, 70, 170);
  let y = 270;
  for (const card of view.cards) {
    g.fillStyle = "#b9a7ff";
    g.font = "bold 36px sans-serif";
    g.fillText(`${PART_LABEL[card.part]}${card.verdict ? ` · ${card.verdict}` : ""}`, 70, y);
    g.fillStyle = "#e9e6ff";
    g.font = "34px sans-serif";
    g.fillText(card.headline.slice(0, 44), 70, y + 52);
    g.fillStyle = "#9d98c8";
    g.font = "26px sans-serif";
    g.fillText(card.proof.slice(0, 62), 70, y + 100);
    y += 270;
  }
  const blob: Blob | null = await new Promise((r) => c.toBlob((b) => r(b), "image/png"));
  if (!blob) return;
  const file = new File([blob], "cosmic-receipts.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
    else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cosmic-receipts.png";
      a.click();
    }
  } catch {
    /* closed */
  }
}

export default function ReceiptsPage() {
  const { data, load, loadCode, reload, act } = useHookView<ReceiptsView>("hooks.cosmicReceipts", "cosmic-receipts");
  const [open, setOpen] = useState<ReceiptPart | null>(null);
  const { busy, msg, run } = useAction();

  const mark = (date: "today" | "yesterday", part: ReceiptPart, verdict: Verdict) =>
    run(() => act("cosmic-receipts/mark", { date, part, verdict }), undefined, codeMessage);

  return (
    <HookPage hook="cosmicReceipts" load={load} loadCode={loadCode} reload={reload} hasData={Boolean(data)}>
      {data && (
        <>
          {data.yesterdayCheck && (
            <Section title="Yesterday check" testId="receipts-yesterday">
              <p className="text-sm">A ten-second look back: how did yesterday's cards land?</p>
              <div className="mt-3 space-y-2">
                {data.yesterdayCheck.parts.map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <span className="w-24 text-sm">{PART_LABEL[p]}</span>
                    {VERDICTS.map((x) => (
                      <Pill key={x.v} tone="quiet" disabled={busy} testId={`yesterday-${p}-${x.v}`} onClick={() => void mark("yesterday", p, x.v)}>
                        {x.label}
                      </Pill>
                    ))}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="space-y-3" data-testid="receipts-cards">
            {data.cards.map((card) => (
              <Section key={card.part} testId={`card-${card.part}`}>
                <button type="button" onClick={() => setOpen(open === card.part ? null : card.part)} className="w-full text-left" aria-expanded={open === card.part}>
                  <p className="flex justify-between text-xs uppercase tracking-wider text-gold">
                    <span>{PART_LABEL[card.part]}</span>
                    <span className="text-muted normal-case">
                      {clockOf(card.startMin)} to {card.endMin >= 1440 ? "24:00" : clockOf(card.endMin)} · {card.status === "live" ? "now" : card.status}
                    </span>
                  </p>
                  <p className="mt-1 text-base font-semibold">{card.headline}</p>
                </button>
                {open === card.part && (
                  <div className="mt-2 space-y-2" data-testid={`card-${card.part}-open`}>
                    <p className="text-sm">{card.text}</p>
                    <p className="text-xs text-muted">{card.proof}</p>
                  </div>
                )}
                {card.status !== "upcoming" && (
                  <div className="mt-3 flex items-center gap-2">
                    {card.verdict ? (
                      <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold" data-testid={`verdict-${card.part}`}>
                        You marked it: {card.verdict}
                      </span>
                    ) : (
                      VERDICTS.map((x) => (
                        <Pill key={x.v} tone="quiet" disabled={busy} testId={`mark-${card.part}-${x.v}`} onClick={() => void mark("today", card.part, x.v)}>
                          {x.label}
                        </Pill>
                      ))
                    )}
                  </div>
                )}
              </Section>
            ))}
          </div>

          <Notice text={msg?.text ?? null} tone={msg?.tone} />

          <Section>
            <div className="flex flex-wrap gap-2">
              <Pill tone="quiet" testId="receipts-share" onClick={() => void shareImage(data)}>
                <Share2 size={14} className="mr-1 inline" /> Share today's receipt
              </Pill>
              {!data.tomorrow.unlocked && (
                <Pill disabled={busy} testId="receipts-peek" onClick={() => void run(() => act("cosmic-receipts/peek", {}), undefined, codeMessage)}>
                  <Coins size={14} className="mr-1 inline" /> Peek at tomorrow, {price(data.tomorrow.pricePaise)}
                </Pill>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              These are Western aspects of the Moon to your natal planets, shown with their degrees. They describe tendencies, and your own marks are the only score here.
            </p>
          </Section>

          {data.tomorrow.unlocked && data.tomorrow.cards && (
            <Section title="Tomorrow" testId="receipts-tomorrow">
              <ul className="space-y-2">
                {data.tomorrow.cards.map((c) => (
                  <li key={c.part} className="text-sm">
                    <b>{PART_LABEL[c.part]}</b>: {c.headline}
                    <span className="block text-xs text-muted">{c.proof}</span>
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
