"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import HookPage from "@/components/hooks/HookPage";
import { ColorStrip, Notice, Pill, Section, useAction } from "@/components/hooks/atoms";
import { useHookView } from "@/hooks/useHookView";
import { api } from "@/lib/api";
import { codeMessage, price } from "@/lib/hooks-copy";
import type { StripColor, TextPerson, TextTimingView } from "@/lib/hooks-types";

const WORD: Record<StripColor, string> = { green: "Green", amber: "Amber", red: "Red" };
const DOT: Record<StripColor, string> = { green: "bg-emerald-400", amber: "bg-amber-300", red: "bg-red-400" };
const toMin = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export default function TextTimingPage() {
  const { data, load, loadCode, reload } = useHookView<{ people: TextPerson[] }>("hooks.textTiming", "text-timing/people");
  const [pid, setPid] = useState<string | null>(null);
  const [view, setView] = useState<TextTimingView | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [variant, setVariant] = useState(0);
  const { busy, msg, run } = useAction();

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;
    setView(null);
    setFailed(null);
    setVariant(0);
    api
      .hookGet<TextTimingView>(`text-timing?profileId=${pid}`)
      .then((v) => !cancelled && setView(v))
      .catch((e: { message?: string }) => !cancelled && setFailed(codeMessage(e?.message ?? null)));
    return () => {
      cancelled = true;
    };
  }, [pid]);

  const v = view?.variants[variant] ?? null;

  return (
    <HookPage hook="textTiming" load={load} loadCode={loadCode} reload={reload} hasData={Boolean(data)}>
      {data && (
        <>
          <Section title="Who?">
            {data.people.length === 0 ? (
              <p className="text-sm text-muted" data-testid="text-none">Save a profile first (a partner, a friend), then pick them here.</p>
            ) : (
              <div className="flex flex-wrap gap-2" data-testid="text-people">
                {data.people.map((p) => (
                  <button
                    key={p.profileId}
                    type="button"
                    disabled={!p.readable}
                    onClick={() => setPid(p.profileId)}
                    data-testid={`person-${p.profileId}`}
                    className={`rounded-full border px-4 py-1.5 text-sm disabled:opacity-40 ${pid === p.profileId ? "border-gold bg-gold/15 text-gold" : "border-gold/25"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </Section>

          {failed && <Notice text={failed} tone="error" />}

          {view && v && (
            <>
              {view.variants.length > 1 && (
                <Section title="Their Moon sign is uncertain">
                  <p className="text-xs text-muted">Without their birth time the Moon could be in either sign that day. Here are both readings.</p>
                  <div className="mt-2 flex gap-2">
                    {view.variants.map((x, i) => (
                      <Pill key={x.label ?? i} tone={i === variant ? "gold" : "quiet"} testId={`variant-${i}`} onClick={() => setVariant(i)}>
                        {x.label}
                      </Pill>
                    ))}
                  </div>
                </Section>
              )}

              <Section title={`${view.person.name}, right now`} testId="text-now">
                {v.now ? (
                  <p className="flex items-center gap-2 text-2xl font-display">
                    <span className={`h-4 w-4 rounded-full ${DOT[v.now.color]}`} />
                    {WORD[v.now.color]}
                  </p>
                ) : (
                  <p className="text-sm text-muted">The day is over.</p>
                )}
                <p className="mt-1 text-sm" data-testid="text-until">
                  {v.bestUntil ? `Best until ${v.bestUntil}.` : v.nextGreen ? `Next green stretch starts at ${v.nextGreen}.` : v.best ? `Best stretch left: ${v.best.start} to ${v.best.end}.` : ""}
                </p>
                <div className="mt-3">
                  <ColorStrip
                    segments={v.runs.map((r) => ({ startMin: toMin(r.start), endMin: r.end === "24:00" ? 1440 : toMin(r.end), color: r.color }))}
                    startMin={0}
                    testId="text-strip"
                  />
                </div>
              </Section>

              <div className="space-y-3" data-testid="text-cards">
                {v.cards.map((c) => (
                  <Section key={c.id} title={c.title} testId={`decoder-${c.id}`}>
                    <p className="text-sm">{c.text}</p>
                    <p className="mt-1 text-xs text-muted">{c.proof}</p>
                  </Section>
                ))}
              </div>

              <Section>
                <Pill
                  disabled={busy || view.alert.armed || !v.best}
                  testId="text-alert"
                  onClick={() =>
                    void run(
                      async () => {
                        const r = await api.hookPost<{ armed: boolean; reason?: string }>("text-timing/alert", { profileId: view.person.profileId }).then(
                          (d) => ({ ok: true, code: null as string | null, d }),
                          (e: { message?: string }) => ({ ok: false, code: e?.message ?? "FAILED", d: null }),
                        );
                        if (r.ok && r.d && !r.d.armed) return { ok: false, code: r.d.reason ?? "FAILED" };
                        if (r.ok) setView(await api.hookGet<TextTimingView>(`text-timing?profileId=${view.person.profileId}`));
                        return { ok: r.ok, code: r.code };
                      },
                      "I will tell you when that stretch begins.",
                      (code) => (code && code.length > 12 ? code : codeMessage(code)),
                    )
                  }
                >
                  <BellRing size={14} className="mr-1 inline" />
                  {view.alert.armed ? "Alert set for the peak" : `Alert me at the peak, ${price(view.alert.pricePaise)}`}
                </Pill>
                <div className="mt-2">
                  <Notice text={msg?.text ?? null} tone={msg?.tone} />
                </div>
                <p className="mt-3 text-xs text-muted">{view.note}</p>
              </Section>
            </>
          )}
        </>
      )}
    </HookPage>
  );
}
