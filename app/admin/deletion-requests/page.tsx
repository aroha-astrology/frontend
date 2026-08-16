"use client";

// Deliberate i18n exception, same as the rest of /admin (see app/admin/layout.tsx) —
// this page stays plain hardcoded English. Do NOT add admin.* i18n keys here.

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminDeletionRequestRow, type AdminUserRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import ErrorRetry from "@/components/admin/ErrorRetry";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysPending(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Hard delete is irreversible (no shell row survives — see
 * hardDeleteUserById's doc comment in the backend). Requiring the admin to
 * type the account's own phone number before the button un-disables is
 * deliberate friction against a mis-click, not decoration.
 */
function DeleteConfirmModal({
  request,
  onClose,
  onDeleted,
}: {
  request: AdminDeletionRequestRow;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmTarget = request.phoneE164 ?? request.email ?? request.id;
  const canConfirm = confirmText.trim() === confirmTarget;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await adminApi.hardDeleteUser(request.id);
      onDeleted(request.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete account");
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={() => !busy && onClose()}
      closeLabel="Close"
      header={<h2 className="text-base font-semibold text-red-400">Permanently delete account</h2>}
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          {request.displayName?.trim() || "This user"} ({confirmTarget}) will be permanently deleted —
          every row, no recovery, no shell. This cannot be undone.
        </p>
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
          onClick={handleDelete}
          disabled={!canConfirm || busy}
          className="w-full px-4 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Permanently delete"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

/** Search-and-flag block for a user who called in rather than tapping Delete Account in-app. */
function FlagUserSection({ onFlagged }: { onFlagged: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      adminApi
        .listUsers({ q: query.trim(), limit: 5 })
        .then((res) => setResults(res.users))
        .catch((err) => setError(err instanceof ApiError ? err.message : "Search failed"))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, query]);

  async function handleFlag(userId: string) {
    setFlaggingId(userId);
    try {
      await adminApi.flagForDeletion(userId);
      setResults((prev) => prev && prev.filter((u) => u.id !== userId));
      onFlagged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to flag user");
    } finally {
      setFlaggingId(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 px-3 py-1.5 rounded-full border border-gold/40 text-gold text-xs hover:bg-gold/10 transition-colors"
      >
        + Flag a user for deletion (e.g. they called in)
      </button>
    );
  }

  return (
    <div className="mb-6 p-4 rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">Flag a user for deletion</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, phone, email, or user ID…"
        className="w-full max-w-sm bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground"
      />
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      {loading && <p className="text-sm text-muted mt-2">Searching…</p>}
      {results && results.length === 0 && !loading && (
        <p className="text-sm text-muted mt-2">No users found.</p>
      )}
      {results && results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-background"
            >
              <div className="text-sm text-foreground">
                {u.displayName ?? "—"}{" "}
                <span className="text-muted text-xs">{u.phoneE164 ?? u.email ?? u.id}</span>
              </div>
              <button
                type="button"
                onClick={() => handleFlag(u.id)}
                disabled={flaggingId === u.id}
                className="px-3 py-1.5 rounded-full border border-gold/40 text-gold text-xs hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                {flaggingId === u.id ? "Flagging…" : "Flag for deletion"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDeletionRequestsPage() {
  const [requests, setRequests] = useState<AdminDeletionRequestRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDeletionRequestRow | null>(null);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listDeletionRequests()
      .then((res) => setRequests(res.requests))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load requests"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleReject(id: string) {
    setRejectingId(id);
    try {
      await adminApi.rejectDeletionRequest(id);
      setRequests((prev) => prev && prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject request");
    } finally {
      setRejectingId(null);
    }
  }

  function handleDeleted(id: string) {
    setRequests((prev) => prev && prev.filter((r) => r.id !== id));
    setDeleteTarget(null);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-4">Account Deletion Requests</h1>

      <FlagUserSection onFlagged={fetchRequests} />

      {loading && !requests && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchRequests} />}

      {requests && !error && (
        <>
          {requests.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">No pending deletion requests.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Phone</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Requested</th>
                    <th className="px-4 py-2 font-medium">Days Pending</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{r.displayName ?? "—"}</td>
                      <td className="px-4 py-2 text-foreground">{r.phoneE164 ?? "—"}</td>
                      <td className="px-4 py-2 text-foreground">{r.email ?? "—"}</td>
                      <td className="px-4 py-2 text-muted">{formatDate(r.deletionRequestedAt)}</td>
                      <td className="px-4 py-2 text-muted">{daysPending(r.deletionRequestedAt)}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleReject(r.id)}
                            disabled={rejectingId === r.id}
                            className="px-3 py-1.5 rounded-full border border-border text-muted text-xs hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            {rejectingId === r.id ? "Rejecting…" : "Reject"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
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
        </>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          request={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
