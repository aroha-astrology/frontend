"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { formatRupees } from "@/lib/format";
import { passApi, type PassStats, type PassSubscriberRow } from "@/lib/pass-api";

/**
 * Admin overview: Aroha Pass subscribers (by how they pay and by tier),
 * the last 30 days' starts, cancellations/expiries and wallet
 * revenue, and Question Pack sales. Quietly absent on a backend that doesn't
 * have the endpoint yet.
 */
/** user_subscriptions.price_variant → its tier label. "none" is a Pass from before the tiers. */
const TIER_NAMES: Record<string, string> = { A: "Silver", B: "Gold", C: "Platinum", none: "Before tiers" };
const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  A: { label: "🥈 Silver", cls: "bg-slate-500/20 text-slate-300" },
  B: { label: "🥇 Gold", cls: "bg-amber-500/20 text-amber-300" },
  C: { label: "💎 Platinum", cls: "bg-purple-500/20 text-purple-300" },
};

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function SubscriberList() {
  const [rows, setRows] = useState<PassSubscriberRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    passApi
      .adminSubscribers(offset, PAGE_SIZE)
      .then((page) => {
        setRows(page.subscribers);
        setTotal(page.total);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [offset]);

  useEffect(() => {
    load();
  }, [load]);

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
  }

  async function shareUser(r: PassSubscriberRow) {
    const text = `User ID: ${r.userId}\nName: ${r.displayName ?? "—"}\nPhone: ${r.phoneE164 ?? "—"}\nTier: ${r.tier ? TIER_NAMES[r.tier] ?? r.tier : "Pass"}\nValid until: ${formatDate(r.periodEnd)}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Aroha Pass Subscriber: ${r.displayName ?? r.userId}`,
          text,
        });
        return;
      } catch {
        // user cancelled or share unsupported; fallback to copy
      }
    }
    navigator.clipboard.writeText(text);
    setSharedId(r.userId);
    setTimeout(() => setSharedId((c) => (c === r.userId ? null : c)), 2000);
  }

  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  if (loading && !rows) return <p className="text-xs text-muted py-4 text-center">Loading subscribers…</p>;
  if (!rows || rows.length === 0) return <p className="text-xs text-muted py-4 text-center">No active subscribers found.</p>;

  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
              <th className="px-3 py-2 font-medium">User &amp; ID</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Tier</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Started</th>
              <th className="px-3 py-2 font-medium">Valid until</th>
              <th className="px-3 py-2 font-medium text-center">Auto-renew</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const badge = r.tier ? TIER_BADGE[r.tier] : null;
              return (
                <tr key={r.userId} className="border-t border-border hover:bg-surface/50 transition-colors">
                  <td className="px-3 py-2">
                    <a
                      href={`/admin/users?q=${encodeURIComponent(r.userId)}`}
                      className="text-foreground text-xs font-semibold hover:text-gold hover:underline transition-colors block"
                      title="Open user in admin"
                    >
                      {r.displayName ?? "—"}
                    </a>
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted select-all">
                      <span>{r.userId}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{r.phoneE164 ?? "—"}</td>
                  <td className="px-3 py-2">
                    {badge ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted capitalize">{r.source.replace("_", " ")}</td>
                  <td className="px-3 py-2 text-xs text-muted">{formatDate(r.startedAt)}</td>
                  <td className="px-3 py-2 text-xs text-foreground font-medium">{formatDate(r.periodEnd)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-medium ${r.autoRenew ? "text-green-400" : "text-muted"}`}>
                      {r.autoRenew ? "✓" : "✕"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyId(r.userId)}
                        title="Copy user ID"
                        className="px-2 py-1 rounded bg-surface border border-border text-[11px] text-muted hover:text-foreground hover:border-gold/50 transition-colors"
                      >
                        {copiedId === r.userId ? "✓ Copied" : "Copy ID"}
                      </button>
                      <button
                        type="button"
                        onClick={() => shareUser(r)}
                        title="Share user details"
                        className="px-2 py-1 rounded bg-surface border border-border text-[11px] text-muted hover:text-foreground hover:border-gold/50 transition-colors"
                      >
                        {sharedId === r.userId ? "✓ Shared" : "Share"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted">
        <span>
          {total === 0
            ? "0 subscribers"
            : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="px-3 py-1.5 rounded-full border border-border disabled:opacity-40 hover:bg-surface/60 transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="px-3 py-1.5 rounded-full border border-border disabled:opacity-40 hover:bg-surface/60 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PassStatsCard() {
  const [stats, setStats] = useState<PassStats | null>(null);
  const [showSubscribers, setShowSubscribers] = useState(true);

  useEffect(() => {
    passApi
      .adminStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) return null;
  const entries = (o: Record<string, number>, names: Record<string, string> = {}) =>
    Object.entries(o)
      .map(([k, v]) => `${names[k] ?? k}: ${v}`)
      .join(" · ") || "—";

  return (
    <section className="mb-8" data-testid="admin-pass-stats">
      <h2 className="text-sm font-semibold text-foreground mb-3">Aroha Pass &amp; Question Packs</h2>
      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Active Passes</dt>
            <dd className="text-lg font-semibold text-foreground">{stats.active.total}</dd>
            <dd className="text-[11px] text-muted">{entries(stats.active.bySource)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">By tier</dt>
            <dd className="text-sm text-foreground">{entries(stats.active.byVariant, TIER_NAMES)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Last 30 days</dt>
            <dd className="text-sm text-foreground">
              {stats.started30d} started · {stats.endedOrCancelled30d} ended/cancelled
            </dd>
            <dd className="text-[11px] text-muted">Wallet revenue {formatRupees(stats.walletRevenuePaise30d)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted uppercase tracking-wide">Question Packs (30 days)</dt>
            <dd className="text-sm text-foreground">
              {stats.packSales30d.count} sold · {formatRupees(stats.packSales30d.revenuePaise)}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <p className="text-[11px] text-muted">Google Play Pass revenue is reported in Play Console, not here.</p>
          <button
            type="button"
            onClick={() => setShowSubscribers((v) => !v)}
            className="text-xs text-gold hover:text-gold/80 transition-colors font-semibold"
          >
            {showSubscribers ? "Hide" : "Show"} subscriber list ({stats.active.total})
          </button>
        </div>

        {showSubscribers && <SubscriberList />}
      </Card>
    </section>
  );
}
