"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminOverview } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import KpiTile from "@/components/admin/KpiTile";
import ErrorRetry from "@/components/admin/ErrorRetry";

// Reuses GET /v1/admin/overview, which already returns newUsers/activeUsers
// scoped to whatever range the preset resolves to server-side — no new
// backend endpoint needed, just four presets fetched in parallel.
const RANGES = ["today", "yesterday", "last7d", "this_month"] as const;

export default function AdminActiveUsersPage() {
  const [data, setData] = useState<Record<(typeof RANGES)[number], AdminOverview> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all(RANGES.map((preset) => adminApi.overview({ preset })))
      .then(([today, yesterday, last7d, this_month]) => setData({ today, yesterday, last7d, this_month }))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load active users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
        </section>
      )}
    </div>
  );
}
