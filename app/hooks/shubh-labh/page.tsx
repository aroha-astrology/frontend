"use client";

import { useState } from "react";
import { BellRing, Coins } from "lucide-react";
import HookPage from "@/components/hooks/HookPage";
import { ColorStrip, Notice, Pill, Section, useAction } from "@/components/hooks/atoms";
import { useHookView } from "@/hooks/useHookView";
import { codeMessage, inMinutes, price } from "@/lib/hooks-copy";
import type { ShubhLabhView } from "@/lib/hooks-types";
import { api } from "@/lib/api";

export default function ShubhLabhPage() {
  const { data, load, loadCode, reload, act } = useHookView<ShubhLabhView>("hooks.shubhLabh", "shubh-labh");
  const [other, setOther] = useState<ShubhLabhView | null>(null);
  const { busy, msg, run } = useAction();
  const view = other ?? data;
  const isToday = !other;

  const openDay = async (date: string) => {
    if (data && date === data.date) {
      setOther(null);
      return;
    }
    try {
      setOther(await api.hookGet<ShubhLabhView>(`shubh-labh?date=${date}`));
    } catch {
      setOther(null);
    }
  };

  return (
    <HookPage hook="shubhLabh" load={load} loadCode={loadCode} reload={reload} hasData={Boolean(data)}>
      {data && view && (
        <>
          {data.place.assumed && (
            <p className="text-xs text-muted" data-testid="place-assumed">
              Using New Delhi because no city is saved. Set your home city in Settings for your own times.
            </p>
          )}
          <Section title={isToday ? "Today, sunrise to sunrise" : view.date} testId="shubh-strip">
            <ColorStrip
              segments={view.windows.map((w) => ({ startMin: w.startMin, endMin: w.endMin, color: w.color }))}
              startMin={view.windows[0]!.startMin}
              nowMin={isToday ? view.now?.minute : null}
              testId="strip"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted">
              <span>{view.sunrise}</span>
              <span>next sunrise</span>
            </div>
            {isToday && view.now && (
              <p className="mt-3 text-sm" data-testid="shubh-now">
                {view.now.window ? (
                  <>
                    Now ({view.now.clock}): <b className="capitalize">{view.now.window.color}</b>, score {view.now.window.score}.
                  </>
                ) : (
                  <>It is {view.now.clock}.</>
                )}
                {view.now.nextGreen && (
                  <>
                    {" "}
                    Next green: {view.now.nextGreen.start} to {view.now.nextGreen.end} ({inMinutes(view.now.nextGreen.inMin)}).
                  </>
                )}
              </p>
            )}
          </Section>

          {view.best ? (
            <Section title="Best window" testId="shubh-best">
              <p className="text-base font-semibold">
                {view.best.start} to {view.best.end} <span className="text-muted text-sm">score {view.best.score}</span>
              </p>
              <p className="mt-1 text-xs text-muted">{view.best.why.join(" · ")}</p>
            </Section>
          ) : (
            <Section>
              <p className="text-sm text-muted">No green window this day. Amber stretches are fine for routine matters.</p>
            </Section>
          )}

          <Section title="All windows">
            <ul className="space-y-1.5" data-testid="shubh-windows">
              {view.windows.map((w) => (
                <li key={w.startMin} className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${w.color === "green" ? "bg-emerald-400" : w.color === "amber" ? "bg-amber-300" : "bg-red-400"}`} />
                  <span className="w-28 shrink-0">{w.start} to {w.end}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">{w.why.join(", ")}</span>
                  <span className="text-xs">{w.score}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              {view.basis === "personal" ? "Includes your own Tara and Moon strength." : "General timing: add your birth details for a personal score."} {view.scoreNote}
            </p>
          </Section>

          <Section title="The next 7 days">
            {data.week.unlocked && data.week.days ? (
              <div className="space-y-2" data-testid="shubh-week">
                <div className="flex flex-wrap gap-2">
                  {data.week.days.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => void openDay(d.date)}
                      data-testid={`week-${d.date}`}
                      className={`rounded-xl border px-3 py-1.5 text-xs ${view.date === d.date ? "border-gold bg-gold/15 text-gold" : "border-gold/20"}`}
                    >
                      {d.date.slice(5)}
                      <br />
                      {d.best ? `${d.best.start}` : "none"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Pill
                    tone="quiet"
                    disabled={busy}
                    testId="shubh-alarm"
                    onClick={() => void run(() => act("shubh-labh/alarm", { date: view.date }, false), "I will tell you 5 minutes before the best window.", codeMessage)}
                  >
                    <BellRing size={14} className="mr-1 inline" /> Alert me before the best window
                  </Pill>
                </div>
                {data.week.alarms.length > 0 && <p className="text-xs text-muted">{data.week.alarms.length} alarm(s) set.</p>}
              </div>
            ) : (
              <div data-testid="shubh-week-locked">
                <p className="text-sm text-muted">See each day's best window and get an alert 5 minutes before it.</p>
                <div className="mt-3">
                  <Pill disabled={busy} testId="shubh-unlock" onClick={() => void run(() => act("shubh-labh/week", {}, false), undefined, codeMessage)}>
                    <Coins size={14} className="mr-1 inline" /> Open for {price(data.week.pricePaise)}
                  </Pill>
                </div>
              </div>
            )}
            <div className="mt-2">
              <Notice text={msg?.text ?? null} tone={msg?.tone} />
            </div>
          </Section>
        </>
      )}
    </HookPage>
  );
}
