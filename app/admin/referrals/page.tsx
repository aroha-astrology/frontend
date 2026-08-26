"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see layout.tsx).

import { Fragment, useCallback, useEffect, useState } from "react";
import { adminApi, type AdminReferralRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import ErrorRetry from "@/components/admin/ErrorRetry";
import ConfirmModal from "@/components/admin/ConfirmModal";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<AdminReferralRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);
  const [broadcastPreview, setBroadcastPreview] = useState<{
    eligibleCount: number;
    pushableCount: number;
    iosCount: number;
    androidCount: number;
    webCount: number;
  } | null>(null);
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<number | null>(null);

  function openBroadcastConfirm() {
    setBroadcastResult(null);
    setBroadcastError(null);
    setBroadcastPreview(null);
    setShowBroadcastConfirm(true);
    adminApi
      .previewReferralPromoBroadcast()
      .then(setBroadcastPreview)
      .catch((err) => setBroadcastError(err instanceof ApiError ? err.message : "Failed to load audience size"));
  }

  async function sendBroadcast() {
    setBroadcastBusy(true);
    setBroadcastError(null);
    try {
      const { attempted } = await adminApi.sendReferralPromoBroadcast();
      setBroadcastResult(attempted);
      setShowBroadcastConfirm(false);
    } catch (err) {
      setBroadcastError(err instanceof ApiError ? err.message : "Failed to send broadcast");
    } finally {
      setBroadcastBusy(false);
    }
  }

  const fetchReferrals = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listReferrals()
      .then((res) => setReferrals(res.referrals))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load referrals"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  function toggleExpanded(referrerId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(referrerId)) {
        next.delete(referrerId);
      } else {
        next.add(referrerId);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gold">Referrals</h1>
        <button
          type="button"
          onClick={openBroadcastConfirm}
          className="px-4 py-2 rounded-full bg-gold text-black text-sm font-medium"
        >
          📣 Send &quot;Share &amp; Earn&quot; Notification
        </button>
      </div>

      {broadcastResult !== null && (
        <p className="mb-4 text-sm text-green-400">
          Sent to {broadcastResult} user{broadcastResult === 1 ? "" : "s"}.
        </p>
      )}

      {loading && !referrals && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchReferrals} />}

      {referrals && !error && (
        <>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">No referrals yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">Referrer</th>
                    <th className="px-4 py-2 font-medium">Phone</th>
                    <th className="px-4 py-2 font-medium text-right">Referrals</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((row) => (
                    <Fragment key={row.referrer.id}>
                      <tr className="border-t border-border">
                        <td className="px-4 py-2 text-foreground">
                          {row.referrer.displayName ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-foreground">
                          {row.referrer.phoneE164 ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-foreground font-medium">
                          {row.count}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(row.referrer.id)}
                            className="px-3 py-1.5 rounded-full border border-border text-muted text-xs hover:text-foreground transition-colors"
                          >
                            {expanded.has(row.referrer.id) ? "Collapse" : "Expand"}
                          </button>
                        </td>
                      </tr>
                      {expanded.has(row.referrer.id) && (
                        <tr key={`${row.referrer.id}-detail`} className="border-t border-border bg-surface/50">
                          <td colSpan={4} className="px-6 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-[10px] text-muted uppercase tracking-wide">
                                  <th className="pb-1 font-medium">Name</th>
                                  <th className="pb-1 font-medium">Phone</th>
                                  <th className="pb-1 font-medium">Joined</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.referredUsers.map((u) => (
                                  <tr key={u.id} className="border-t border-border/50">
                                    <td className="py-1.5 pr-4 text-foreground">
                                      {u.displayName ?? "—"}
                                    </td>
                                    <td className="py-1.5 pr-4 text-foreground">
                                      {u.phoneE164 ?? "—"}
                                    </td>
                                    <td className="py-1.5 text-muted">{formatDate(u.createdAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-muted">
            {referrals.length === 0
              ? "No referrers found."
              : `${referrals.length} referrer${referrals.length === 1 ? "" : "s"} · lifetime totals`}
          </p>
        </>
      )}

      {showBroadcastConfirm && (
        <ConfirmModal
          title="Send referral-promo notification"
          body={
            <>
              <p className="mb-2">
                Pushes a &quot;Share &amp; Earn&quot; notification to every active user right now, in
                their own language, quoting the live referral bonus amounts. This cannot be undone
                or unsent.
              </p>
              {broadcastPreview ? (
                <div className="text-foreground">
                  <p>
                    {broadcastPreview.eligibleCount} eligible ·{" "}
                    {broadcastPreview.pushableCount} have a push token
                  </p>
                  <p className="text-xs text-muted mt-1">
                    📱 iOS {broadcastPreview.iosCount} · 🤖 Android {broadcastPreview.androidCount}
                    {broadcastPreview.webCount > 0 ? ` · 🌐 Web ${broadcastPreview.webCount}` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-foreground">Loading audience size…</p>
              )}
            </>
          }
          confirmLabel="Send Now"
          busy={broadcastBusy}
          error={broadcastError}
          onConfirm={sendBroadcast}
          onCancel={() => setShowBroadcastConfirm(false)}
        />
      )}
    </div>
  );
}
