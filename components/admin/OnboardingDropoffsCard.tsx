"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { adminApi, type AdminOnboardingDropoffs, type AdminOnboardingDropoff } from "@/lib/admin-api";

const DAY_OPTIONS = [7, 30, 90] as const;

/** The onboarding chat's questions, in order, keyed by the name it saves (app/onboarding ONBOARDING_STEP_NAMES). */
const STEP_LABELS: Record<string, string> = {
  language: "1 · Language",
  name: "2 · Name",
  dob: "3 · Date of birth",
  tob: "4 · Birth time",
  time_window: "4 · Part of day",
  place: "5 · Birth place",
  gender: "6 · Gender",
  relationship_status: "7 · Relationship",
  confirm: "Review & consent",
};

const TEST_LABELS: Record<NonNullable<AdminOnboardingDropoff["likelyTest"]>, string> = {
  test_lab: "Google Test Lab",
  play_review: "Likely Google test device",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Admin overview: people who signed up and left without finishing the
 * onboarding chat, with the question they stopped on. Google's own test
 * devices sign up on every Play build and never finish, so they are hidden by
 * default. Quietly absent on a backend that doesn't have the endpoint yet.
 */
export default function OnboardingDropoffsCard() {
  const [days, setDays] = useState<number>(30);
  const [hideTests, setHideTests] = useState(true);
  const [data, setData] = useState<AdminOnboardingDropoffs | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .onboardingDropoffs(days)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (!data) return null;

  const rows = hideTests ? data.users.filter((u) => !u.likelyTest) : data.users;
  const realLeft = data.left - data.likelyTest;

  return (
    <section className="mb-8" data-testid="admin-onboarding-dropoffs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Left during onboarding</h2>
        <div className="flex gap-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-lg text-[12px] border ${
                d === days ? "border-gold/60 bg-gold/15 text-gold" : "border-gold/15 text-muted"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>
      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Signed up</dt>
            <dd className="text-lg font-semibold text-foreground">{data.signedUp}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Finished</dt>
            <dd className="text-lg font-semibold text-foreground">{data.finished}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Left</dt>
            <dd className="text-lg font-semibold text-foreground" data-testid="dropoffs-real-left">
              {realLeft}
            </dd>
            <dd className="text-[11px] text-muted">real people</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Google test devices</dt>
            <dd className="text-lg font-semibold text-foreground">{data.likelyTest}</dd>
            <dd className="text-[11px] text-muted">left too, not customers</dd>
          </div>
        </dl>

        <label className="mt-4 flex items-center gap-2 text-[12px] text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={hideTests}
            onChange={(e) => setHideTests(e.target.checked)}
            className="w-4 h-4 accent-gold"
          />
          Hide Google test devices
        </label>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nobody left during onboarding in the last {data.days} days.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-muted uppercase tracking-wide">
                  <th className="py-1.5 pr-4 font-medium">Signed up</th>
                  <th className="py-1.5 pr-4 font-medium">Who</th>
                  <th className="py-1.5 pr-4 font-medium">Stopped at</th>
                  <th className="py-1.5 pr-4 font-medium">Time in app</th>
                  <th className="py-1.5 pr-4 font-medium">Came back</th>
                  <th className="py-1.5 pr-4 font-medium">Language</th>
                  <th className="py-1.5 pr-4 font-medium">Device</th>
                  <th className="py-1.5 font-medium">Country</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t border-gold/10 align-top" data-testid={`dropoff-row-${u.id}`}>
                    <td className="py-1.5 pr-4 text-foreground whitespace-nowrap">{formatWhen(u.createdAt)}</td>
                    <td className="py-1.5 pr-4 text-foreground">
                      <div className="break-all">{u.displayName || u.email || u.phoneE164 || u.id.slice(0, 8)}</div>
                      <div className="text-[11px] text-muted">
                        {u.signInMethod === "phone" ? "Phone OTP" : "Google"}
                        {u.likelyTest && <span className="ml-1 text-amber-500">· {TEST_LABELS[u.likelyTest]}</span>}
                      </div>
                    </td>
                    <td className="py-1.5 pr-4 text-foreground whitespace-nowrap">
                      {u.lastStep ? STEP_LABELS[u.lastStep] ?? u.lastStep : <span className="text-muted">Not recorded</span>}
                    </td>
                    <td className="py-1.5 pr-4 text-foreground whitespace-nowrap">{u.minutesActive} min</td>
                    <td className="py-1.5 pr-4 text-foreground">{u.activeDays > 1 ? `Yes, ${u.activeDays} days` : "No"}</td>
                    <td className="py-1.5 pr-4 text-foreground uppercase">{u.language ?? "–"}</td>
                    <td className="py-1.5 pr-4 text-foreground capitalize">{u.platform ?? "–"}</td>
                    <td className="py-1.5 text-foreground">{u.country ? [u.city, u.country].filter(Boolean).join(", ") : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted">
          Answers are only saved when someone taps &quot;Begin My Journey&quot;, so this shows the question they reached,
          not what they typed. &quot;Not recorded&quot; means they signed up before the app started saving the step.
          Time in app comes from the once-a-minute activity ping.
        </p>
      </Card>
    </section>
  );
}
