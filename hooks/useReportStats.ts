"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { reportsApi, type ReportStatsResponse } from "@/lib/reports-api";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";

/**
 * The backend itself caches GET /v1/reports/stats for ~5 minutes (see
 * lib/reports-api.ts's doc comment), so this client-side SWR window just
 * needs to be a reasonable instant-paint window rather than a correctness
 * mechanism — matches hooks/useReportCatalogue.ts's reasoning. Kept shorter
 * than the catalogue's 30-minute TTL since this number is meant to look
 * "live" (real generated-report counts), not merely not-stale.
 */
const SWR_TTL_MS = 5 * 60 * 1000;

/**
 * Fetches the real "N reports generated" counts once per mount (no
 * polling — this isn't a generating/ready state machine, just a plain
 * counter) for display alongside a report's price. Not user- or
 * profile-scoped (the count is global across all users), but the cache key
 * still keys off the signed-in user so a signed-out visitor never reads
 * another session's cached numbers.
 */
export function useReportStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReportStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    const cacheKey = buildKey("reports-stats", user.id);
    const cached = cacheGet<ReportStatsResponse>(cacheKey);
    if (cached) {
      setStats(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    reportsApi
      .stats()
      .then((res) => {
        if (cancelled) return;
        setStats(res);
        cacheSet(cacheKey, res, Date.now() + SWR_TTL_MS);
      })
      .catch(() => {
        // Fail quiet — a missing count just means the display line doesn't
        // render (see ReportCard/ReportPurchaseDrawer), never a page error.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { stats, loading };
}
