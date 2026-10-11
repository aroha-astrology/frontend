"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import Card from "@/components/ui/Card";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { ApiError } from "@/lib/api";
import { passApi, type PassLaunchReadiness, type PassLaunchSwitch } from "@/lib/pass-api";

/**
 * Admin overview: is the Aroha Pass ready to go live, and the one launch
 * notification. Lists every switch the Pass needs with its state for everyone
 * (they are changed on Admin → Features), then offers a try-out push to the
 * admin alone and the real send, which the server refuses until the Pass is
 * ready and which only reaches users an earlier send missed. Quietly absent on
 * a backend that doesn't have the endpoint yet.
 */
function SwitchRow({ row }: { row: PassLaunchSwitch }) {
  const missing = row.need === "required" && !row.enabled;
  return (
    <li className="flex items-start gap-2 text-sm" data-testid={`pass-launch-switch-${row.key}`}>
      {row.enabled ? (
        <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
      ) : missing ? (
        <X size={15} className="mt-0.5 shrink-0 text-red-400" />
      ) : (
        <Minus size={15} className="mt-0.5 shrink-0 text-muted" />
      )}
      <span className="min-w-0">
        <span className={missing ? "text-foreground" : "text-foreground/85"}>{row.label}</span>
        <span className="block text-[11px] text-muted">
          {row.key} · {row.enabled ? "on" : missing ? "off, needed" : "off, optional"}
        </span>
      </span>
    </li>
  );
}

export default function PassLaunchCard() {
  const [data, setData] = useState<PassLaunchReadiness | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    passApi
      .launchReadiness()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(load, [load]);

  async function send(onlyMe: boolean) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await passApi.sendLaunch(onlyMe);
      setNote(
        onlyMe
          ? "Sent to you. Check your phone and the bell."
          : `Sent to ${res.attempted} users${res.skipped ? ` (${res.skipped} already had it)` : ""}${res.failed ? `, ${res.failed} failed` : ""}.`,
      );
      setConfirming(false);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError && err.message === "PASS_NOT_READY"
          ? "The Pass is not ready yet. Turn on the switches marked as needed first."
          : "Could not send. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  const left = data.audience.users - data.audience.alreadySent;

  return (
    <section className="mb-8" data-testid="admin-pass-launch">
      <h2 className="text-sm font-semibold text-foreground mb-3">Aroha Pass go-live</h2>
      <Card className="p-4 space-y-4">
        <p
          className={`text-sm font-semibold ${data.ready ? "text-emerald-400" : "text-amber-400"}`}
          data-testid="pass-launch-ready"
        >
          {data.ready
            ? "Ready: the Pass is on sale and every feature it promises can be opened."
            : "Not ready: something the Pass needs is still off."}
        </p>

        <ul className="grid gap-2 md:grid-cols-2">
          {data.switches.map((row) => (
            <SwitchRow key={row.key} row={row} />
          ))}
          <li className="flex items-start gap-2 text-sm">
            {data.playConfigured ? (
              <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
            ) : (
              <X size={15} className="mt-0.5 shrink-0 text-red-400" />
            )}
            <span>
              Server can check purchases with Google Play
              <span className="block text-[11px] text-muted">
                {data.playConfigured ? "configured" : "not configured on the server"}
              </span>
            </span>
          </li>
        </ul>

        <p className="text-[11px] text-muted">
          Switches are changed on{" "}
          <Link href="/admin/features" className="text-gold underline underline-offset-2">
            Admin → Features
          </Link>
          . This list shows what is on for everyone; a user group can still differ.
        </p>

        <div className="border-t border-gold/10 pt-4 space-y-3">
          <p className="text-sm text-foreground">Launch notification: &quot;Aroha Pass is here&quot;</p>
          <p className="text-[11px] text-muted">
            {data.audience.users} users · {data.audience.withPush} can get a push · {data.audience.alreadySent} already
            sent. Everyone gets it in the bell; users who turned off Offers, or are in quiet hours, get no push.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void send(true)}
              className="rounded-xl border border-gold/30 px-4 py-2 text-xs font-semibold text-gold disabled:opacity-50"
            >
              Send a try-out to me
            </button>
            <button
              type="button"
              disabled={busy || !data.ready || left === 0}
              onClick={() => setConfirming(true)}
              data-testid="pass-launch-send"
              className="rounded-xl bg-gold px-4 py-2 text-xs font-bold text-[#1a0e00] disabled:opacity-40"
            >
              {left === 0 ? "Sent to everyone" : `Send to ${left} users`}
            </button>
          </div>
          {note && <p className="text-xs text-emerald-400">{note}</p>}
          {error && !confirming && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </Card>

      {confirming && (
        <ConfirmModal
          title="Send the Aroha Pass launch notification?"
          body={
            <>
              This goes to {left} users now, in their language, and opens the Aroha Pass page. It cannot be taken
              back.
            </>
          }
          confirmLabel={`Send to ${left} users`}
          busy={busy}
          error={error}
          onConfirm={() => void send(false)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  );
}
