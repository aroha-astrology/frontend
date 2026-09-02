"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  adminApi,
  type AdminOverview,
  type AdminUserRow,
  type AdminRecurringUsersWeek,
  type AdminUserDemographicsResponse,
  type AdminDemographicsBucket,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import {
  addGst,
  estimateLlmCostPaise,
  estimateLlmListPricePaise,
  GEMINI_INPUT_USD_PER_MILLION_TOKENS,
  GEMINI_OUTPUT_USD_PER_MILLION_TOKENS,
  GST_RATE,
  isValidCustomRange,
  splitFreeVsPaid,
} from "@/lib/admin-format";
import { fetchUsdInrRate, FALLBACK_RATE, type UsdInrRate } from "@/lib/fx";
import DateRangePicker, { type AdminRangeValue } from "@/components/admin/DateRangePicker";
import KpiTile from "@/components/admin/KpiTile";
import ErrorRetry from "@/components/admin/ErrorRetry";
import RevenueLineChart from "@/components/admin/RevenueLineChart";
import SpendByFeatureBarChart from "@/components/admin/SpendByFeatureBarChart";
import Card from "@/components/ui/Card";
import CostSplitBar from "@/components/admin/CostSplitBar";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const RECURRING_WEEK_LABELS: Record<AdminRecurringUsersWeek["label"], string> = {
  this_week: "This Week",
  last_week: "Last Week",
  last_week_plus_1: "Last Week +1",
  last_week_plus_2: "Last Week +2",
};

function formatDemographicsLabel(label: string): string {
  return label
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** One labelled count table in the User Demographics row. `buckets` is null while the
 *  single fetch for the whole row is still in flight. */
function DemographicsCard({
  title,
  buckets,
}: {
  title: string;
  buckets: AdminDemographicsBucket[] | null;
}) {
  return (
    <Card className="p-4">
      <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{title}</h3>
      {!buckets ? (
        <p className="text-sm text-muted py-2">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {buckets.map((b) => (
              <tr key={b.label} className="border-t border-border first:border-t-0">
                <td className="py-1.5 text-foreground">{formatDemographicsLabel(b.label)}</td>
                <td className="py-1.5 text-right text-foreground">{b.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function defaultCustomRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

function AdminOverviewContent() {
  const searchParams = useSearchParams();
  const [range, setRange] = useState<AdminRangeValue>({ preset: "last30d", from: "", to: "" });
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Deep-linkable so the users table can link straight to "what has this person
  // cost us in AI" — same ?userId= pattern the tickets page already uses.
  const [userId, setUserId] = useState(searchParams.get("userId") ?? "");

  // Whole user list for the filter dropdown — small enough (dozens, not
  // thousands) to fetch once rather than build a searchable typeahead.
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  useEffect(() => {
    adminApi
      .listUsers({ limit: 100 })
      .then((res) => setUsers(res.users))
      .catch(() => setUsers([]));
  }, []);
  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.displayName ?? a.phoneE164 ?? a.email ?? a.id).localeCompare(
          b.displayName ?? b.phoneE164 ?? b.email ?? b.id,
        ),
      ),
    [users],
  );

  const canFetch = range.preset !== "custom" || isValidCustomRange(range.from, range.to);

  // Live USD→INR, fetched once per mount. Starts on the pinned fallback so the
  // table renders immediately rather than blocking on a third-party endpoint,
  // then re-renders with the real rate when it lands.
  const [fx, setFx] = useState<UsdInrRate>(FALLBACK_RATE);
  useEffect(() => {
    let cancelled = false;
    void fetchUsdInrRate().then((r) => {
      if (!cancelled) setFx(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Estimated ₹ cost per agent, sorted so the biggest cost drivers surface
  // first — the backend deliberately returns raw tokens only (see
  // ai-usage.repo.ts's costByAgent() doc comment), so the ₹ conversion and
  // sort happen here, client-side.
  const llmCostRows = useMemo(() => {
    const rows = (data?.llmCostByAgent ?? []).map((row) => ({
      ...row,
      // GST-inclusive: this account is billed in INR, so Google adds GST on top
      // of the converted list price and that is what reaches the invoice.
      costPaise: addGst(estimateLlmCostPaise(row, fx.rate)),
      listPricePaise: addGst(estimateLlmListPricePaise(row, fx.rate)),
    }));
    // Sort by list price, not billed cost: on a normal day everything is free
    // tier and billed cost is ₹0 across the board, which would leave the table
    // in arbitrary order exactly when you most want to see the volume drivers.
    return rows.sort((a, b) => b.listPricePaise - a.listPricePaise);
  }, [data, fx.rate]);

  const llmCostTotalPaise = useMemo(() => llmCostRows.reduce((sum, row) => sum + row.costPaise, 0), [llmCostRows]);
  const llmListPriceTotalPaise = useMemo(
    () => llmCostRows.reduce((sum, row) => sum + row.listPricePaise, 0),
    [llmCostRows],
  );

  // Fixed-period AI billing totals (Today/Yesterday/This Week/This Month) —
  // independent of the DateRangePicker above, so these always show "as of
  // now" regardless of what range the rest of the page is scoped to. Reruns
  // whenever the user filter changes, same as the AI Cost by Feature table.
  const BILLING_PERIODS = ["today", "yesterday", "last7d", "this_month"] as const;
  const [periodBillingPaise, setPeriodBillingPaise] = useState<Record<(typeof BILLING_PERIODS)[number], number> | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    Promise.all(BILLING_PERIODS.map((preset) => adminApi.overview({ preset, userId: userId || undefined })))
      .then((results) => {
        if (cancelled) return;
        const totals = {} as Record<(typeof BILLING_PERIODS)[number], number>;
        BILLING_PERIODS.forEach((preset, i) => {
          totals[preset] = results[i].llmCostByAgent.reduce(
            (sum, row) => sum + addGst(estimateLlmCostPaise(row, fx.rate)),
            0,
          );
        });
        setPeriodBillingPaise(totals);
      })
      .catch(() => {
        if (!cancelled) setPeriodBillingPaise(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fx.rate]);

  // Recurring users: a fixed four-week comparison, independent of the
  // DateRangePicker/userId above — same "always as of now" convention as
  // periodBillingPaise. Fetched once on mount, no inputs to depend on.
  const [recurringWeeks, setRecurringWeeks] = useState<AdminRecurringUsersWeek[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    adminApi
      .recurringUsers()
      .then((res) => {
        if (!cancelled) setRecurringWeeks(res.weeks);
      })
      .catch(() => {
        if (!cancelled) setRecurringWeeks(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // User demographics: same "always as of now, fetched once" convention as
  // recurringWeeks above — a snapshot of all current users, not scoped to
  // the DateRangePicker/userId.
  const [demographics, setDemographics] = useState<AdminUserDemographicsResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    adminApi
      .userDemographics()
      .then((res) => {
        if (!cancelled) setDemographics(res);
      })
      .catch(() => {
        if (!cancelled) setDemographics(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchOverview = useCallback(() => {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    adminApi
      .overview({
        preset: range.preset,
        from: range.from || undefined,
        to: range.to || undefined,
        userId: userId || undefined,
      })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load overview"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.preset, range.from, range.to, canFetch, userId]);

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
              <h2 className="text-sm font-semibold text-foreground mb-3">Recurring Users</h2>
              <Card className="p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-muted uppercase tracking-wide">
                      <th className="pb-2 font-medium">Week</th>
                      <th className="pb-2 font-medium text-right">Active Users</th>
                      <th className="pb-2 font-medium text-right">Recurring Users</th>
                      <th className="pb-2 font-medium text-right">Recurring %</th>
                      <th className="pb-2 font-medium text-right">Time Spent (hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!recurringWeeks ? (
                      <tr>
                        <td colSpan={5} className="text-muted text-center py-4">
                          Loading…
                        </td>
                      </tr>
                    ) : (
                      recurringWeeks.map((week) => (
                        <tr key={week.label} className="border-t border-border">
                          <td className="py-2 text-foreground">{RECURRING_WEEK_LABELS[week.label]}</td>
                          <td className="py-2 text-right text-foreground">{week.activeUsers.toLocaleString()}</td>
                          <td className="py-2 text-right text-foreground">{week.recurringUsers.toLocaleString()}</td>
                          <td className="py-2 text-right text-muted">
                            {week.activeUsers === 0
                              ? "—"
                              : `${Math.round((week.recurringUsers / week.activeUsers) * 100)}%`}
                          </td>
                          <td className="py-2 text-right text-muted">{week.timeSpentHours.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
              <p className="text-[11px] text-muted mt-2 max-w-2xl">
                <strong>Recurring</strong> = active that week AND active at least once in an earlier week (returning,
                not first-time) — derived from existing chat/voice/report/order/AI-usage history, since per-user
                activity isn&apos;t logged as a standalone event elsewhere. <strong>Time Spent</strong> approximates
                engagement from chat session duration plus voice minutes charged — it does not capture time spent
                just reading reports or browsing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-sm font-semibold text-foreground mb-3">User Demographics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DemographicsCard title="Age Bracket" buckets={demographics?.ageBrackets ?? null} />
                <DemographicsCard title="Gender" buckets={demographics?.gender ?? null} />
                <DemographicsCard
                  title="Relationship Status"
                  buckets={demographics?.relationshipStatus ?? null}
                />
                <DemographicsCard
                  title="Monthly Income"
                  buckets={demographics?.incomeBrackets ?? null}
                />
                <DemographicsCard
                  title="Household Income"
                  buckets={demographics?.familyIncomeBrackets ?? null}
                />
              </div>
              <p className="text-[11px] text-muted mt-2 max-w-2xl">
                Snapshot of all current (non-deleted) users, independent of the date range above. Age is derived
                from encrypted date-of-birth and grouped into fixed brackets; &quot;Unknown&quot; covers users who
                never provided a birth date or a value that failed to parse. Income is self-reported in chat as a
                one-tap range, asked only when a money question needs a scale to read against — &quot;Not Asked&quot;
                is therefore the expected majority, and &quot;Undisclosed&quot; means the user declined.
              </p>
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

                <h2 className="text-sm font-semibold text-foreground mb-3 mt-6">AI Billing</h2>
                <Card className="p-4">
                  {periodBillingPaise ? (
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-[11px] text-muted uppercase tracking-wide">Today</dt>
                        <dd className="text-lg font-semibold text-foreground">
                          {formatRupees(periodBillingPaise.today)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted uppercase tracking-wide">Yesterday</dt>
                        <dd className="text-lg font-semibold text-foreground">
                          {formatRupees(periodBillingPaise.yesterday)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted uppercase tracking-wide">Last 7 Days</dt>
                        <dd className="text-lg font-semibold text-foreground">
                          {formatRupees(periodBillingPaise.last7d)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted uppercase tracking-wide">This Month</dt>
                        <dd className="text-lg font-semibold text-foreground">
                          {formatRupees(periodBillingPaise.this_month)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted">Loading…</p>
                  )}
                  <p className="text-[11px] text-muted mt-3">
                    {userId ? "Scoped to the user selected below." : "All users."} Real ₹ billed to the paid reserve
                    key, at list price GST-inclusive, for these fixed periods — independent of the date range
                    selected above, so this only matches "Billed (₹)" in the table on the right when that range
                    happens to cover the same period.
                  </p>
                </Card>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-foreground">AI Cost by Feature</h2>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground w-56"
                  >
                    <option value="">All users</option>
                    {sortedUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName ?? u.phoneE164 ?? u.email ?? u.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Total cost first, then the free-vs-paid split beneath it — green is
                    what the free key pool absorbed, red is what actually hit the paid
                    reserve. Same split.freePercent + split.paidPercent === 100 rule as
                    the per-row bars below (see splitFreeVsPaid in lib/admin-format.ts). */}
                <Card className="p-4 mb-3">
                  <p className="text-xs text-muted mb-1">Total (if unsubsidised)</p>
                  <p className="text-2xl font-semibold text-foreground mb-3">
                    {formatRupees(llmListPriceTotalPaise)}
                  </p>
                  <CostSplitBar split={splitFreeVsPaid(llmListPriceTotalPaise, llmCostTotalPaise)} />
                </Card>

                <Card className="p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-muted uppercase tracking-wide">
                        <th className="pb-2 font-medium">Feature</th>
                        <th className="pb-2 font-medium text-right">Tokens In</th>
                        <th className="pb-2 font-medium text-right">Tokens Out</th>
                        <th className="pb-2 font-medium text-right">Calls</th>
                        <th className="pb-2 font-medium text-right">Paid Calls</th>
                        <th className="pb-2 font-medium text-right">Billed (₹)</th>
                        <th className="pb-2 font-medium text-right">If Unsubsidised (₹)</th>
                        <th className="pb-2 font-medium text-left pl-3">Free vs Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {llmCostRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-muted text-center py-4">
                            {userId ? "No AI usage for this user in this range" : "No data"}
                          </td>
                        </tr>
                      ) : (
                        <>
                          {llmCostRows.map((row) => (
                            <tr key={row.agent} className="border-t border-border">
                              <td className="py-2 text-foreground">{row.agent}</td>
                              <td className="py-2 text-right text-foreground">{row.tokensIn.toLocaleString()}</td>
                              <td className="py-2 text-right text-foreground">{row.tokensOut.toLocaleString()}</td>
                              <td className="py-2 text-right text-foreground">{row.calls.toLocaleString()}</td>
                              <td className="py-2 text-right text-foreground">{row.paidCalls.toLocaleString()}</td>
                              <td className="py-2 text-right text-foreground">{formatRupees(row.costPaise)}</td>
                              <td className="py-2 text-right text-muted">{formatRupees(row.listPricePaise)}</td>
                              <td className="py-2 pl-3 min-w-[160px]">
                                <CostSplitBar split={splitFreeVsPaid(row.listPricePaise, row.costPaise)} compact />
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-border font-semibold">
                            <td className="py-2 text-foreground">Total</td>
                            <td className="py-2 text-right text-foreground" />
                            <td className="py-2 text-right text-foreground" />
                            <td className="py-2 text-right text-foreground" />
                            <td className="py-2 text-right text-foreground" />
                            <td className="py-2 text-right text-gold">{formatRupees(llmCostTotalPaise)}</td>
                            <td className="py-2 text-right text-muted">{formatRupees(llmListPriceTotalPaise)}</td>
                            <td className="py-2 pl-3 min-w-[160px]">
                              <CostSplitBar
                                split={splitFreeVsPaid(llmListPriceTotalPaise, llmCostTotalPaise)}
                                compact
                              />
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </Card>
                <p className="text-[11px] text-muted mt-2 max-w-xl">
                  <strong className="text-green-400">Green</strong> = covered by the free key pool, real ₹ NOT
                  spent. <strong className="text-red-400">Red</strong> = served by the paid reserve, real ₹ spent.
                  Both bars split the same "If Unsubsidised" total, so they always add up to 100%.{" "}
                  <strong>Billed</strong> counts only calls served by the paid reserve key — the free key pool costs
                  ₹0 however many tokens it burns, so on an ordinary day this is ₹0 and that is correct.{" "}
                  <strong>If Unsubsidised</strong> is what the same usage would have cost at list price, i.e. what the
                  free pool is saving. Both are estimates from token counts (Gemini Flash-Lite pricing at $
                  {GEMINI_INPUT_USD_PER_MILLION_TOKENS}/$
                  {GEMINI_OUTPUT_USD_PER_MILLION_TOKENS} per 1M in/out tokens), converted at ₹{fx.rate.toFixed(2)}/USD
                  {fx.isFallback ? " (offline fallback rate — live lookup failed)" : ` (ECB, ${fx.asOf})`} and shown
                  inclusive of {Math.round(GST_RATE * 100)}% GST, since this account is billed in INR. GST is normally
                  recoverable as input tax credit, so net cost is {(1 / (1 + GST_RATE)).toFixed(3)}× these figures.{" "}
                  <strong>Voice calls are not counted here at all</strong> — Gemini Live is billed separately and never
                  writes to <code>ai_usage</code>. Reports appear per type (
                  <code>report:marriage</code> and so on); rows recorded before per-user attribution shipped have no
                  user and will not appear under a user filter.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole route
  // into client-side rendering — same wrapper the tickets page uses.
  return (
    <Suspense fallback={<p className="text-sm text-muted text-center py-10">Loading…</p>}>
      <AdminOverviewContent />
    </Suspense>
  );
}
