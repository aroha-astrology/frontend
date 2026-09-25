"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { formatRupees } from "@/lib/format";
import { passApi, type PassStats } from "@/lib/pass-api";

/**
 * Admin overview: Aroha Pass subscribers (by how they pay and by price
 * variant), the last 30 days' starts, cancellations/expiries and wallet
 * revenue, and Question Pack sales. Quietly absent on a backend that doesn't
 * have the endpoint yet.
 */
export default function PassStatsCard() {
  const [stats, setStats] = useState<PassStats | null>(null);

  useEffect(() => {
    passApi
      .adminStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) return null;
  const entries = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([k, v]) => `${k}: ${v}`)
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
            <dt className="text-[11px] text-muted uppercase tracking-wide">By price variant</dt>
            <dd className="text-sm text-foreground">{entries(stats.active.byVariant)}</dd>
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
        <p className="mt-3 text-[11px] text-muted">Google Play Pass revenue is reported in Play Console, not here.</p>
      </Card>
    </section>
  );
}
