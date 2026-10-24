"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see layout.tsx).

import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  type AdminPlayRefundCheck,
  type AdminPlayRefundRow,
  type AdminPlayRefundsPage,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import ErrorRetry from "@/components/admin/ErrorRetry";

/** Google's voidedReason codes, in plain words. */
const REASONS = [
  "Other",
  "Changed their mind",
  "Not received",
  "Defective",
  "Bought by accident",
  "Fraud",
  "Friendly fraud",
  "Bank chargeback",
  "Never confirmed by the app",
];
const SOURCES = ["the buyer", "us (Play Console)", "Google"];

const STATUS: Record<string, { label: string; tone: string }> = {
  recorded: { label: "Recorded only (switch off)", tone: "bg-amber-500/15 text-amber-400" },
  clawed_back: { label: "Taken back", tone: "bg-green-500/15 text-green-400" },
  skipped: { label: "Nothing to take (order not paid)", tone: "bg-white/10 text-muted" },
  pass: { label: "Pass: Google ends it", tone: "bg-white/10 text-muted" },
  not_credited: { label: "Never credited (lost sale)", tone: "bg-red-500/15 text-red-400" },
  unmatched: { label: "No matching order", tone: "bg-red-500/15 text-red-400" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function whatItGave(row: AdminPlayRefundRow): string {
  if (row.kind === "question_pack") return `${row.questionCredits} questions`;
  if (row.kind === "pass") return `Aroha Pass ${row.amountPaise > 0 ? formatRupees(row.amountPaise) : ""}`.trim();
  if (row.kind === "unknown") return "Unknown purchase";
  return `${formatRupees(row.amountPaise)} wallet money`;
}

function RefundCard({
  row,
  busy,
  onToggleBlock,
}: {
  row: AdminPlayRefundRow;
  busy: boolean;
  onToggleBlock: () => void;
}) {
  const status = STATUS[row.status] ?? { label: row.status, tone: "bg-white/10 text-muted" };
  const reason = row.voidedReason !== null ? REASONS[row.voidedReason] : null;
  const source = row.voidedSource !== null ? SOURCES[row.voidedSource] : null;
  const owes = row.walletBalancePaise !== null && row.walletBalancePaise < 0;
  return (
    <div data-testid={`play-refund-${row.id}`} className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-medium text-foreground break-all">
          {row.userId ? (row.userName ?? "No name") : "User not found"}
        </span>
        {row.userId && <span className="text-[11px] text-muted font-mono break-all">{row.userId}</span>}
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${status.tone}`}>{status.label}</span>
        {row.purchasesBlocked && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Purchases blocked</span>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted">Bought</dt>
        <dd className="text-foreground">
          {whatItGave(row)} · {row.productId ?? "—"} · {formatDate(row.purchasedAt)}
        </dd>
        <dt className="text-muted">Refunded</dt>
        <dd className="text-foreground">
          {formatDate(row.voidedAt ?? row.createdAt)}
          {reason ? ` · ${reason}` : ""}
          {source ? ` · by ${source}` : ""}
        </dd>
        {row.status === "clawed_back" && (
          <>
            <dt className="text-muted">Taken back</dt>
            <dd className="text-foreground">
              {row.clawedBackQuestions > 0
                ? `${row.clawedBackQuestions} questions`
                : formatRupees(row.clawedBackPaise)}
              {row.reportsLocked > 0 ? ` · ${row.reportsLocked} report${row.reportsLocked === 1 ? "" : "s"} locked` : ""}
            </dd>
          </>
        )}
        {row.walletBalancePaise !== null && (
          <>
            <dt className="text-muted">Wallet now</dt>
            <dd className={owes ? "text-red-400 font-medium" : "text-foreground"}>
              {formatRupees(row.walletBalancePaise)}
              {owes ? " (owes)" : ""}
            </dd>
          </>
        )}
        {row.googleOrderId && (
          <>
            <dt className="text-muted">Order</dt>
            <dd className="text-muted font-mono break-all">{row.googleOrderId}</dd>
          </>
        )}
      </dl>
      {row.userId && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onToggleBlock}
            disabled={busy}
            className="px-3 py-1.5 rounded-full border border-border text-foreground text-xs disabled:opacity-50 hover:bg-white/5 transition-colors"
          >
            {busy ? "Saving…" : row.purchasesBlocked ? "Unblock purchases" : "Block purchases"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminPlayRefundsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminPlayRefundsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<AdminPlayRefundCheck | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);

  const load = useCallback((p: number) => {
    setError(null);
    adminApi
      .listPlayRefunds(p)
      .then(setData)
      .catch((err) => setError(errorText(err, "Failed to load refunds")));
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  async function runCheck() {
    setChecking(true);
    setActionError(null);
    try {
      setCheckResult(await adminApi.checkPlayRefunds());
      load(page);
    } catch (err) {
      setActionError(errorText(err, "Could not ask Google for refunds"));
    } finally {
      setChecking(false);
    }
  }

  async function toggleBlock(row: AdminPlayRefundRow) {
    if (!row.userId) return;
    setBusyUser(row.userId);
    setActionError(null);
    try {
      await adminApi.setPurchasesBlocked(row.userId, !row.purchasesBlocked);
      load(page);
    } catch (err) {
      setActionError(errorText(err, "Could not change the block"));
    } finally {
      setBusyUser(null);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="text-xl font-semibold text-gold">Play Refunds</h1>
        <button
          type="button"
          onClick={runCheck}
          disabled={checking}
          className="px-4 py-2 rounded-full bg-gold text-black text-sm font-medium disabled:opacity-50"
        >
          {checking ? "Asking Google…" : "Check now"}
        </button>
      </div>
      <p className="text-xs text-muted mb-4 max-w-2xl">
        Every Google Play refund and chargeback, found by an hourly check and by Google&apos;s notice. With the switch{" "}
        <span className="font-mono">paid.refundClawback</span> off (Features), refunds are only recorded. With it on, the
        refunded money or questions are taken back, even below zero, reports bought with that money lock until it is
        paid, and a second refund blocks purchases. &quot;Never credited&quot; means the buyer paid but the app never
        confirmed it, so Google refunded it by itself after 3 days.
      </p>
      {data && (
        <p data-testid="clawback-switch" className={`text-xs mb-4 ${data.clawbackOn ? "text-green-400" : "text-amber-400"}`}>
          {data.clawbackOn
            ? "Switch on for everyone: refunds are taken back."
            : "Switch off for everyone (it may be on for a test group): refunds are recorded only."}
        </p>
      )}
      {checkResult && (
        <p data-testid="check-result" className="text-xs text-foreground mb-4">
          Google listed {checkResult.checked} refunds in the last 30 days: {checkResult.recorded} new recorded,{" "}
          {checkResult.clawedBack} taken back, {checkResult.pass} Pass, {checkResult.unmatched} unmatched,{" "}
          {checkResult.skipped} skipped, {checkResult.notCredited} never credited. The rest were already
          handled.
        </p>
      )}
      {actionError && <p className="text-sm text-red-400 mb-3">{actionError}</p>}
      {error && <ErrorRetry message={error} onRetry={() => load(page)} />}
      {!data && !error && <p className="text-sm text-muted text-center py-10">Loading…</p>}

      {data && !error && (
        <>
          {data.refunds.length === 0 ? (
            <p className="text-sm text-muted py-6">No refunds found yet.</p>
          ) : (
            <div className="space-y-3">
              {data.refunds.map((row) => (
                <RefundCard
                  key={row.id}
                  row={row}
                  busy={busyUser === row.userId}
                  onToggleBlock={() => toggleBlock(row)}
                />
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6 text-sm">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-full border border-border disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-muted">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pages}
                className="px-3 py-1.5 rounded-full border border-border disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
