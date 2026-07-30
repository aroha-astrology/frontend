"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { reportsApi, type ReportCatalogueEntry } from "@/lib/reports-api";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";

/**
 * The catalogue's own shape (label/price/enabled) rarely changes, but its
 * `purchases` list changes the moment the user buys a report — every mount
 * still does a fresh network fetch regardless of a cache hit (the cache only
 * provides instant paint), so a stale purchases list from before a purchase
 * self-heals the next time this hook mounts. 30 minutes is a
 * generous-but-bounded SWR TTL for that instant-paint case, not a
 * correctness mechanism — see lib/cache.ts's module doc. `refetch()` is also
 * exposed for callers that stay mounted across a mutation (e.g. the
 * catalogue page after a monthly-bundle purchase closes its drawer without
 * navigating away).
 */
const SWR_TTL_MS = 30 * 60 * 1000;

/**
 * Fetches GET /v1/reports for the active profile. `enabled` gates the fetch
 * the same way every other feature-gated hook does (see hooks/useKundli.ts) —
 * pass `useFeature('home.reportsSection').enabled` from the caller (both
 * app/reports/page.tsx and Home's components/ReportsSlider.tsx do this).
 */
export function useReportCatalogue(enabled: boolean = true) {
  const { user, activeProfile } = useAuth();
  const [reports, setReports] = useState<ReportCatalogueEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !user) {
      setReports(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = buildKey("reports-catalogue", user.id, activeProfile?.id ?? "primary");
    const cached = cacheGet<ReportCatalogueEntry[]>(cacheKey);
    if (cached) {
      setReports(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    reportsApi
      .catalogue()
      .then((res) => {
        if (cancelled) return;
        setReports(res.reports);
        setError(null);
        cacheSet(cacheKey, res.reports, Date.now() + SWR_TTL_MS);
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep showing a last-known-good cached catalogue if we have one —
        // surface the error only when there's nothing to fall back to.
        if (!cached) setError(err instanceof Error ? err.message : "Failed to load reports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, user?.id, activeProfile?.id, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { reports, loading, error, refetch };
}
