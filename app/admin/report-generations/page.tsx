"use client";

// Deliberate i18n exception, same as the rest of /admin (see app/admin/layout.tsx) —
// this page stays plain hardcoded English. Do NOT add admin.* i18n keys here.

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, type AdminReportGenerationRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import ErrorRetry from "@/components/admin/ErrorRetry";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

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

const STATUS_STYLE: Record<AdminReportGenerationRow["status"], string> = {
  ready: "text-emerald-400 border-emerald-500/40",
  generating: "text-amber-400 border-amber-500/40",
  queued: "text-amber-400 border-amber-500/40",
  failed: "text-muted border-border",
};

/** Reset is reversible (status -> 'failed', content survives — see backend's
 * adminResetReportRow), so this is a single plain confirm, not a typed one. */
function ResetConfirmModal({
  title,
  body,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <BottomSheetModal onClose={() => !busy && onClose()} closeLabel="Close" header={<h2 className="text-base font-semibold text-gold">{title}</h2>}>
      <div className="space-y-4">
        <p className="text-sm text-foreground">{body}</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="w-full px-4 py-3 rounded-2xl bg-gold text-background text-sm font-medium disabled:opacity-40"
        >
          {busy ? "Resetting…" : "Reset"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

/** Delete is irreversible (hard DELETE, no backup job) — requires typing the exact
 * confirm target before the button un-disables, same friction idiom as the account
 * hard-delete modal on /admin/deletion-requests. */
function DeleteConfirmModal({
  title,
  body,
  confirmTarget,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmTarget: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText.trim() === confirmTarget;

  return (
    <BottomSheetModal onClose={() => !busy && onClose()} closeLabel="Close" header={<h2 className="text-base font-semibold text-red-400">{title}</h2>}>
      <div className="space-y-4">
        <p className="text-sm text-foreground">{body}</p>
        <div>
          <label className="text-xs text-muted block mb-1">
            Type <span className="text-foreground font-mono">{confirmTarget}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            autoComplete="off"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm || busy}
          className="w-full px-4 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Permanently delete"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

type BulkAction = { kind: "reset-all" | "delete-all"; reportKey: string };

export default function AdminReportGenerationsPage() {
  const [rows, setRows] = useState<AdminReportGenerationRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<string>("");
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminReportGenerationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReportGenerationRow | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchRows = useCallback((reportKey: string) => {
    setLoading(true);
    setError(null);
    adminApi
      .listReportGenerations({ reportKey: reportKey || undefined, limit: 200 })
      .then((res) => {
        setRows(res.reports);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load report generations"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRows(filterKey);
  }, [fetchRows, filterKey]);

  // Every report key seen across the unfiltered load — populated once (before any filter is
  // applied) so the dropdown doesn't collapse to one option once a filter narrows `rows`.
  const [allKeys, setAllKeys] = useState<string[]>([]);
  useEffect(() => {
    if (filterKey === "" && rows) {
      setAllKeys(Array.from(new Set(rows.map((r) => r.reportKey))).sort());
    }
  }, [filterKey, rows]);

  const reportKeyOptions = useMemo(() => allKeys, [allKeys]);

  async function handleReset(row: AdminReportGenerationRow) {
    setRowBusyId(row.id);
    setModalError(null);
    try {
      await adminApi.resetReportGeneration(row.id);
      setRows((prev) => prev && prev.map((r) => (r.id === row.id ? { ...r, status: "failed" } : r)));
      setResetTarget(null);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Failed to reset report");
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDelete(row: AdminReportGenerationRow) {
    setRowBusyId(row.id);
    setModalError(null);
    try {
      await adminApi.deleteReportGeneration(row.id);
      setRows((prev) => prev && prev.filter((r) => r.id !== row.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteTarget(null);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Failed to delete report");
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleBulk() {
    if (!bulkAction) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      if (bulkAction.kind === "reset-all") {
        await adminApi.resetReportGenerationsAll(bulkAction.reportKey);
      } else {
        await adminApi.deleteReportGenerationsAll(bulkAction.reportKey);
      }
      setBulkAction(null);
      fetchRows(filterKey);
    } catch (err) {
      setBulkError(err instanceof ApiError ? err.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-1">Report Generations</h1>
      <p className="text-sm text-muted mb-4">Every report any user has generated — reset a row (content survives, the owner can regenerate it) or permanently delete it.</p>

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

        {filterKey && (
          <>
            <button
              type="button"
              onClick={() => setBulkAction({ kind: "reset-all", reportKey: filterKey })}
              className="px-3 py-1.5 rounded-full border border-gold/40 text-gold text-xs hover:bg-gold/10 transition-colors"
            >
              Reset all “{filterKey}”
            </button>
            <button
              type="button"
              onClick={() => setBulkAction({ kind: "delete-all", reportKey: filterKey })}
              className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
            >
              Delete all “{filterKey}”
            </button>
          </>
        )}
      </div>

      {loading && !rows && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={() => fetchRows(filterKey)} />}

      {rows && !error && (
        <>
          {rows.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">No reports found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Report</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Paid</th>
                    <th className="px-4 py-2 font-medium">Generated</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">
                        {r.displayName ?? "—"} <span className="text-muted text-xs">{r.phoneE164 ?? r.userId}</span>
                      </td>
                      <td className="px-4 py-2 text-foreground">{r.reportKey}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-2 text-muted">{formatRupees(r.pricePaidPaise)}</td>
                      <td className="px-4 py-2 text-muted">{formatDateTime(r.createdAt)}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setResetTarget(r)}
                            disabled={rowBusyId === r.id}
                            className="px-3 py-1.5 rounded-full border border-gold/40 text-gold text-xs hover:bg-gold/10 transition-colors disabled:opacity-50"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            disabled={rowBusyId === r.id}
                            className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
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

      {resetTarget && (
        <ResetConfirmModal
          title="Reset report"
          body={`${resetTarget.displayName ?? resetTarget.phoneE164 ?? "This user"}'s "${resetTarget.reportKey}" report will flip to Retry — content and the paid record are kept, they can regenerate it.`}
          busy={rowBusyId === resetTarget.id}
          error={modalError}
          onClose={() => {
            setResetTarget(null);
            setModalError(null);
          }}
          onConfirm={() => handleReset(resetTarget)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Permanently delete report"
          body={`${deleteTarget.displayName ?? deleteTarget.phoneE164 ?? "This user"}'s "${deleteTarget.reportKey}" report row will be deleted — no recovery, no paid-record trace. Prefer Reset unless you specifically need this gone.`}
          confirmTarget={deleteTarget.reportKey}
          busy={rowBusyId === deleteTarget.id}
          error={modalError}
          onClose={() => {
            setDeleteTarget(null);
            setModalError(null);
          }}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}

      {bulkAction?.kind === "reset-all" && (
        <ResetConfirmModal
          title="Reset all"
          body={`Every non-failed "${bulkAction.reportKey}" report, across every user, will flip to Retry. Content and paid records are kept.`}
          busy={bulkBusy}
          error={bulkError}
          onClose={() => {
            setBulkAction(null);
            setBulkError(null);
          }}
          onConfirm={handleBulk}
        />
      )}

      {bulkAction?.kind === "delete-all" && (
        <DeleteConfirmModal
          title="Permanently delete all"
          body={`Every "${bulkAction.reportKey}" report row, across every user, will be deleted — no recovery, no paid-record trace.`}
          confirmTarget={bulkAction.reportKey}
          busy={bulkBusy}
          error={bulkError}
          onClose={() => {
            setBulkAction(null);
            setBulkError(null);
          }}
          onConfirm={handleBulk}
        />
      )}
    </div>
  );
}
