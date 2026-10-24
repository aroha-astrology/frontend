"use client";

import { useEffect, useState } from "react";
import { Lock, ScrollText } from "lucide-react";
import HookPage from "@/components/hooks/HookPage";
import { Notice, Pill, Section, useAction } from "@/components/hooks/atoms";
import { useHookView } from "@/hooks/useHookView";
import { codeMessage, price } from "@/lib/hooks-copy";
import type { RahasyaView, Scroll } from "@/lib/hooks-types";
import { api } from "@/lib/api";

export default function RahasyaPage() {
  const { data, load, loadCode, reload, act } = useHookView<RahasyaView>("hooks.kundliRahasya", "rahasya");
  const [n, setN] = useState<number | null>(null);
  const [scroll, setScroll] = useState<Scroll | null>(null);
  const { busy, msg, run } = useAction();

  // Open scroll 1 the first time the page loads.
  useEffect(() => {
    if (data && n === null) setN(data.scroll?.n ?? 1);
  }, [data, n]);

  // Fetch the chosen scroll in full whenever the choice changes.
  useEffect(() => {
    if (!data || n === null) return;
    const slot = data.slots[n - 1];
    if (!slot || slot.status !== "open") {
      setScroll(null);
      return;
    }
    if (data.scroll?.n === n) {
      setScroll(data.scroll);
      return;
    }
    let cancelled = false;
    api
      .hookGet<RahasyaView>(`rahasya?n=${n}`)
      .then((v) => !cancelled && setScroll(v.scroll))
      .catch(() => !cancelled && setScroll(null));
    return () => {
      cancelled = true;
    };
  }, [data, n]);

  const chosen = data && n !== null ? data.slots[n - 1] : null;

  return (
    <HookPage hook="kundliRahasya" load={load} loadCode={loadCode} reload={reload} hasData={Boolean(data)}>
      {data && (
        <>
          <Section>
            <div className="grid grid-cols-6 gap-2" data-testid="rahasya-grid">
              {data.slots.map((s) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setN(s.n)}
                  data-testid={`scroll-${s.n}`}
                  data-status={s.status}
                  aria-label={`Scroll ${s.n}, ${s.status}`}
                  className={`relative grid h-11 place-items-center rounded-xl border text-sm ${
                    n === s.n ? "border-gold bg-gold/20 text-gold" : s.status === "open" ? "border-gold/30 text-foreground" : "border-gold/10 text-muted"
                  }`}
                >
                  {s.status === "open" ? s.n : <Lock size={14} />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted" data-testid="rahasya-count">
              {data.openCount} of 17 open.{" "}
              {data.next
                ? data.next.needs === "ritual"
                  ? `The next one opens at ${data.next.opensAtLocal} on a day you finish your Morning Ritual${data.next.ritualDoneToday ? " (done today)" : ""}.`
                  : `The next one opens at ${data.next.opensAtLocal} on a day you visit this page.`
                : "Every scroll is open."}
            </p>
          </Section>

          {chosen?.status === "open" && scroll && (
            <Section testId="rahasya-scroll">
              <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
                <ScrollText size={14} />
                Scroll {scroll.n} · {scroll.title}
              </p>
              {scroll.badge === "moon-chart" && (
                <p className="mt-2 inline-block rounded-full border border-gold/30 px-3 py-0.5 text-xs text-gold" data-testid="moon-chart-badge">
                  Moon-chart mode: your birth time is not exact
                </p>
              )}
              <p className="mt-2 text-base font-semibold">{scroll.headline}</p>
              <dl className="mt-3 space-y-1">
                {scroll.facts.map((f) => (
                  <div key={f.label} className="flex justify-between gap-3 text-sm">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="text-right">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <details className="mt-3" data-testid="rahasya-why">
                <summary className="cursor-pointer text-sm text-gold">Why?</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
                  {scroll.why.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </details>
            </Section>
          )}

          {chosen?.status === "locked" && (
            <Section testId="rahasya-locked">
              <p className="text-sm">Scroll {chosen.n} is not open yet.</p>
              <p className="mt-1 text-xs text-muted">Open it now for {price(data.unlockPricePaise)} (free with Gold and Platinum).</p>
              <div className="mt-3">
                <Pill
                  disabled={busy}
                  testId="rahasya-unlock"
                  onClick={() =>
                    void run(
                      async () => {
                        const r = await act<RahasyaView>("rahasya/unlock", { n: chosen.n });
                        if (r.ok && r.data) setScroll(r.data.scroll);
                        return r;
                      },
                      undefined,
                      codeMessage,
                    )
                  }
                >
                  Open scroll {chosen.n}
                </Pill>
              </div>
              <div className="mt-2">
                <Notice text={msg?.text ?? null} tone={msg?.tone} />
              </div>
            </Section>
          )}
        </>
      )}
    </HookPage>
  );
}
