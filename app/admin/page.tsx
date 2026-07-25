"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminOverview } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { isValidCustomRange } from "@/lib/admin-format";
import DateRangePicker, { type AdminRangeValue } from "@/components/admin/DateRangePicker";
import KpiTile from "@/components/admin/KpiTile";
import ErrorRetry from "@/components/admin/ErrorRetry";
import RevenueLineChart from "@/components/admin/RevenueLineChart";
import SpendByFeatureBarChart from "@/components/admin/SpendByFeatureBarChart";
import Card from "@/components/ui/Card";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultCustomRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

export default function AdminOverviewPage() {
  const [range, setRange] = useState<AdminRangeValue>({ preset: "last30d", from: "", to: "" });
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canFetch = range.preset !== "custom" || isValidCustomRange(range.from, range.to);

  const fetchOverview = useCallback(() => {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    adminApi
      .overview({ preset: range.preset, from: range.from || undefined, to: range.to || undefined })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load overview"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.preset, range.from, range.to, canFetch]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  function handleRangeChange(next: AdminRangeValue) {
    // Prefill a sensible default window the first time the admin switches into 'custom'.
    if (next.preset === "custom" && range.preset !== "custom" && !next.from && !next.to) {
      const defaults = defaultCustomRange();
      setRange({ preset: "custom", from: defaults.from, to: defaults.to });
      return;
    }
    setRange(next);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-4">Overview</h1>

      <DateRangePicker value={range} onChange={handleRangeChange} />

      {data && (
        <p className="text-xs text-muted mt-3">
          Showing {data.range.from} to {data.range.to}
        </p>
      )}

      <div className="mt-6">
        {loading && !data && <p className="text-sm text-muted text-center py-10">Loading…</p>}
        {error && <ErrorRetry message={error} onRetry={fetchOverview} />}

        {data && !error && (
          <>
            {/* Cash In vs Wallet Spend are deliberately two separate tiles, never
                summed — see the caption below for why. */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KpiTile label="Cash In" value={formatRupees(data.cashInPaise)} caption={`${data.orderCount} orders`} />
              <KpiTile label="Wallet Spend" value={formatRupees(data.walletSpendPaise)} />
            </section>
            <p className="text-[11px] text-muted mt-2 mb-6 max-w-2xl">
              Cash In is real money received from top-ups. Wallet Spend is wallet balance consumed on features —
              partly funded by the free signup grant, not all of it real revenue. These measure different things and
              are never summed into one number.
            </p>

            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <KpiTile label="Wallet Liability" value={formatRupees(data.walletLiabilityPaise)} />
              <KpiTile label="Paying Users" value={String(data.payingUsers)} />
              <KpiTile label="ARPU" value={formatRupees(data.arpuPaise)} />
              <KpiTile label="New Users" value={String(data.newUsers)} />
              <KpiTile label="Active Users" value={String(data.activeUsers)} />
            </section>

            <section className="mb-8">
              <h2 className="text-sm font-semibold text-foreground mb-3">Revenue Over Time</h2>
              <Card className="p-4">
                <RevenueLineChart data={data.timeSeries} />
              </Card>
            </section>

            <section className="mb-8">
              <h2 className="text-sm font-semibold text-foreground mb-3">Spend by Feature</h2>
              <Card className="p-4">
                <SpendByFeatureBarChart data={data.spendByFeature} />
              </Card>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Top-Up Funnel</h2>
                <Card className="p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-muted uppercase tracking-wide">
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topUpFunnel.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="text-muted text-center py-4">
                            No data
                          </td>
                        </tr>
                      ) : (
                        data.topUpFunnel.map((row) => (
                          <tr key={row.status} className="border-t border-border">
                            <td className="py-2 text-foreground">{row.status}</td>
                            <td className="py-2 text-right text-foreground">{row.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">LLM Cost by Agent</h2>
                <Card className="p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-muted uppercase tracking-wide">
                        <th className="pb-2 font-medium">Agent</th>
                        <th className="pb-2 font-medium text-right">Tokens In</th>
                        <th className="pb-2 font-medium text-right">Tokens Out</th>
                        <th className="pb-2 font-medium text-right">Calls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.llmCostByAgent.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted text-center py-4">
                            No data
                          </td>
                        </tr>
                      ) : (
                        data.llmCostByAgent.map((row) => (
                          <tr key={row.agent} className="border-t border-border">
                            <td className="py-2 text-foreground">{row.agent}</td>
                            <td className="py-2 text-right text-foreground">{row.tokensIn.toLocaleString()}</td>
                            <td className="py-2 text-right text-foreground">{row.tokensOut.toLocaleString()}</td>
                            <td className="py-2 text-right text-foreground">{row.calls.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
