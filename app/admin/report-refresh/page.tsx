"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see layout.tsx).

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminReportRefresh } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import ErrorRetry from "@/components/admin/ErrorRetry";

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function AdminReportRefreshPage() {
  const [data, setData] = useState<AdminReportRefresh | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(() => {
    setError(null);
    adminApi
      .reportRefreshStatus()
      .then(setData)
      .catch((err) => setError(errorText(err, "Failed to load rebuild status")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRetry() {
    setRetrying(true);
    setActionError(null);
    setResetMessage(null);
    try {
      const res = await adminApi.retryFailedReportRefreshes();
      setResetMessage(`Reset ${res.reset} reports`);
      load();
    } catch (err) {
      setActionError(errorText(err, "Could not retry failed rebuilds"));
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="text-xl font-semibold text-gold">Old report rebuilds</h1>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-full border border-border text-foreground text-sm font-medium hover:bg-white/5 transition-colors"
        >
          Refresh
        </button>
      </div>
      <p className="text-xs text-muted mb-4 max-w-2xl">
        Reports written before the corrected planet data are rewritten free the first time their owner opens it. The
        reader sees an &apos;Updating your report&apos; screen. Turn it off on Features → reports.refreshOldOnOpen.
      </p>
      {actionError && <p className="text-sm text-red-400 mb-3">{actionError}</p>}
      {resetMessage && <p className="text-sm text-green-400 mb-3">{resetMessage}</p>}
      {error && <ErrorRetry message={error} onRetry={load} />}
      {!data && !error && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {data && !error && (
        <>
          <p className="text-sm text-foreground mb-2">
            Switch: {data.switchOn ? "On" : "Off"} · Model tried first: {data.model ?? "Gemini (no Oxion pick)"} → Gemini free keys → Gemini paid keys
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-border p-4 text-center">
              <p className="text-xs text-muted">Waiting</p>
              <p className="text-lg font-semibold text-foreground">{data.waiting}</p>
            </div>
            <div className="rounded-2xl border border-border p-4 text-center">
              <p className="text-xs text-muted">Rebuilding now</p>
              <p className="text-lg font-semibold text-foreground">{data.running}</p>
            </div>
            <div className="rounded-2xl border border-border p-4 text-center">
              <p className="text-xs text-muted">Rebuilt</p>
              <p className="text-lg font-semibold text-foreground">{data.rebuilt}</p>
            </div>
            <div className="rounded-2xl border border-border p-4 text-center">
              <p className="text-xs text-muted">Failed (3 tries)</p>
              <p className="text-lg font-semibold text-foreground">{data.failed}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4 mb-6">
            <h2 className="text-sm font-medium text-foreground mb-3">Rebuilt by model</h2>
            {data.byModel.length === 0 ? (
              <p className="text-sm text-muted">None yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted text-left">
                    <th className="pb-2 font-normal">Model</th>
                    <th className="pb-2 font-normal">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byModel.map((row) => (
                    <tr key={row.model} className="border-t border-border">
                      <td className="py-2 text-foreground">{row.model}</td>
                      <td className="py-2 text-foreground">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying || data.failed === 0}
            className="px-4 py-2 rounded-full bg-gold text-black text-sm font-medium disabled:opacity-50"
          >
            {retrying ? "Retrying…" : "Retry failed"}
          </button>
        </>
      )}
    </div>
  );
}
