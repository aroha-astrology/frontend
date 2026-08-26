"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminOverview, type AdminLocationCountRow, type AdminDateRangePreset } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import KpiTile from "@/components/admin/KpiTile";
import ErrorRetry from "@/components/admin/ErrorRetry";

// Reuses GET /v1/admin/overview, which already returns newUsers/activeUsers
// scoped to whatever range the preset resolves to server-side — no new
// backend endpoint needed, just five presets fetched in parallel.
const RANGES = ["today", "yesterday", "last7d", "this_month", "this_year"] as const;

const LOCATION_PRESETS: { value: AdminDateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7d", label: "Week" },
  { value: "this_month", label: "Month" },
  { value: "this_year", label: "Year" },
];

export default function AdminActiveUsersPage() {
  const [data, setData] = useState<Record<(typeof RANGES)[number], AdminOverview> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [locationPreset, setLocationPreset] = useState<AdminDateRangePreset>("today");
  const [locations, setLocations] = useState<AdminLocationCountRow[] | null>(null);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all(RANGES.map((preset) => adminApi.overview({ preset })))
      .then(([today, yesterday, last7d, this_month, this_year]) =>
        setData({ today, yesterday, last7d, this_month, this_year }),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load active users"))
      .finally(() => setLoading(false));
  }, []);

  const fetchLocations = useCallback(() => {
    setLocationsLoading(true);
    setLocationsError(null);
    adminApi
      .activeUsersByLocation(locationPreset)
      .then((res) => setLocations(res.locations))
      .catch((err) => setLocationsError(err instanceof ApiError ? err.message : "Failed to load locations"))
      .finally(() => setLocationsLoading(false));
  }, [locationPreset]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-4">Active Users</h1>

      {loading && !data && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchAll} />}

      {data && !error && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiTile label="New Users Today" value={String(data.today.newUsers)} />
          <KpiTile label="New Users Yesterday" value={String(data.yesterday.newUsers)} />
          <KpiTile label="Active Users Today" value={String(data.today.activeUsers)} />
          <KpiTile label="Active Users Yesterday" value={String(data.yesterday.activeUsers)} />
          <KpiTile label="Active Users This Week" value={String(data.last7d.activeUsers)} />
          <KpiTile label="Active Users This Month" value={String(data.this_month.activeUsers)} />
          <KpiTile label="Active Users This Year" value={String(data.this_year.activeUsers)} />
        </section>
      )}

      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-base font-semibold text-foreground">By Location</h2>
        <div className="flex gap-1 rounded-xl border border-border p-1">
          {LOCATION_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setLocationPreset(p.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                locationPreset === p.value ? "bg-gold text-black" : "text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {locationsLoading && !locations && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {locationsError && <ErrorRetry message={locationsError} onRetry={fetchLocations} />}

      {locations && !locationsError && (
        locations.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">No active users in this window.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                  <th className="px-4 py-2 font-medium">Country</th>
                  <th className="px-4 py-2 font-medium">City</th>
                  <th className="px-4 py-2 font-medium text-right">Total Users</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((row, i) => (
                  <tr key={`${row.country ?? "unknown"}-${row.city ?? "unknown"}-${i}`} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{row.country ?? "Unresolved"}</td>
                    <td className="px-4 py-2 text-foreground">{row.city || "—"}</td>
                    <td className="px-4 py-2 text-right text-foreground">{row.totalUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
