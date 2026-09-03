"use client";

// Deliberate i18n exception, same as the rest of /admin (see app/admin/layout.tsx) —
// this page stays plain hardcoded English. Do NOT add admin.* i18n keys here.

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, type AdminReportRatingRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import ErrorRetry from "@/components/admin/ErrorRetry";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReportRatingsPage() {
  const [rows, setRows] = useState<AdminReportRatingRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<string>("");

  const fetchRows = useCallback((reportKey: string) => {
    setLoading(true);
    setError(null);
    adminApi
      .listReportRatings({ reportKey: reportKey || undefined, limit: 200 })
      .then((res) => {
        setRows(res.ratings);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load report ratings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRows(filterKey);
  }, [fetchRows, filterKey]);

  // Every report key seen across the unfiltered load — same idiom as
  // /admin/report-generations, so the dropdown doesn't collapse to one
  // option once a filter narrows `rows`.
  const [allKeys, setAllKeys] = useState<string[]>([]);
  useEffect(() => {
    if (filterKey === "" && rows) {
      setAllKeys(Array.from(new Set(rows.map((r) => r.reportKey))).sort());
    }
  }, [filterKey, rows]);

  const reportKeyOptions = useMemo(() => allKeys, [allKeys]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-1">Report Ratings</h1>
      <p className="text-sm text-muted mb-4">Every rating a user has left on a report — a rating under 3 stars auto-refunds 100% of the price paid, shown in the Refunded column.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filterKey}
          onChange={(e) => setFilterKey(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
        >
          <option value="">All report keys</option>
          {reportKeyOptions.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      {loading && !rows && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={() => fetchRows(filterKey)} />}

      {rows && !error && (
        <>
          {rows.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">No ratings found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Report</th>
                    <th className="px-4 py-2 font-medium">Stars</th>
                    <th className="px-4 py-2 font-medium">Comment</th>
                    <th className="px-4 py-2 font-medium">Refunded</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">
                        {r.displayName ?? "—"} <span className="text-muted text-xs">{r.phoneE164 ?? r.userId}</span>
                      </td>
                      <td className="px-4 py-2 text-foreground">{r.reportKey}</td>
                      <td className="px-4 py-2 text-foreground">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                      <td className="px-4 py-2 text-muted max-w-xs truncate">{r.comment ?? "—"}</td>
                      <td className="px-4 py-2">
                        {r.refundedPaise ? (
                          <span className="text-red-400">{formatRupees(r.refundedPaise)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > rows.length && (
            <p className="text-xs text-muted mt-2">Showing {rows.length} of {total} — narrow with a report filter to see the rest.</p>
          )}
        </>
      )}
    </div>
  );
}
