"use client";

import { Coins, Moon } from "lucide-react";
import HookPage from "@/components/hooks/HookPage";
import { Notice, Pill, Section, useAction } from "@/components/hooks/atoms";
import { useHookView } from "@/hooks/useHookView";
import { codeMessage, price } from "@/lib/hooks-copy";
import type { SleepView } from "@/lib/hooks-types";

const FACES = ["Rough", "Poor", "Okay", "Good", "Great"];

export default function SleepSyncPage() {
  const { data, load, loadCode, reload, act } = useHookView<SleepView>("hooks.sleepSync", "sleep-sync");
  const { busy, msg, run } = useAction();

  return (
    <HookPage hook="sleepSync" load={load} loadCode={loadCode} reload={reload} hasData={Boolean(data)}>
      {data && (
        <>
          <Section title="Last night's Moon" testId="sleep-moon">
            <p className="flex items-center gap-2 text-lg font-display">
              <Moon size={18} className="text-gold" />
              {data.lastNight.nakshatra} · {data.lastNight.sign}
            </p>
            {data.lastNight.bindus !== null && (
              <p className="mt-1 text-xs text-muted">The Moon holds {data.lastNight.bindus} of 8 bindus in {data.lastNight.sign} in your chart.</p>
            )}
          </Section>

          <Section title="How did you sleep?" testId="sleep-log">
            <div className="grid grid-cols-5 gap-2">
              {FACES.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  disabled={busy}
                  data-testid={`sleep-${i + 1}`}
                  aria-pressed={data.logged === i + 1}
                  onClick={() => void run(() => act("sleep-sync/log", { score: i + 1 }), undefined, codeMessage)}
                  className={`rounded-xl border py-2 text-xs ${data.logged === i + 1 ? "border-gold bg-gold/20 text-gold" : "border-gold/20"}`}
                >
                  <span className="block text-base">{i + 1}</span>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <Notice text={msg?.text ?? null} tone={msg?.tone} />
            </div>
          </Section>

          <Section title="Your pattern" testId="sleep-pattern">
            {data.pattern.ready ? (
              <div className="space-y-2 text-sm">
                <p>
                  <b>Nights that felt best:</b> {data.pattern.topNames.join(", ")}
                </p>
                <p>
                  <b>Nights that felt hardest:</b> {data.pattern.bottomNames.join(", ")}
                </p>
                {data.pattern.confidence === "early" && (
                  <p className="text-xs text-muted">This is an early read from single nights. The Moon returns to the same nakshatra about every 27 days, so it firms up with repeat visits.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">
                {data.pattern.nights} of {data.pattern.needed} nights logged. After {data.pattern.needed} nights you will see your best and hardest nakshatras.
              </p>
            )}
          </Section>

          <Section title="30-day pattern report">
            {data.report.unlocked && data.report.data ? (
              <div className="space-y-1 text-sm" data-testid="sleep-report">
                <p>{data.report.data.nights} nights logged, average {data.report.data.average ?? "n/a"}.</p>
                <p>Longest run of good nights (4 or 5): {data.report.data.longestGoodRun}.</p>
                <p className="text-xs text-muted">By Moon sign: {data.report.data.bySign.map((s) => `${s.average} (${s.nights})`).join(", ") || "none yet"}</p>
              </div>
            ) : (
              <Pill disabled={busy} testId="sleep-report-unlock" onClick={() => void run(() => act("sleep-sync/report", {}), undefined, codeMessage)}>
                <Coins size={14} className="mr-1 inline" /> Open for {price(data.report.pricePaise)}
              </Pill>
            )}
          </Section>

          <p className="text-xs text-muted">{data.note}</p>
        </>
      )}
    </HookPage>
  );
}
