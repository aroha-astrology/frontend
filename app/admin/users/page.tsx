"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminUserRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import {
  computeWalletDeltaPaise,
  isUserOnline,
  validateWalletNote,
  type WalletAdjustSign,
} from "@/lib/admin-format";
import ErrorRetry from "@/components/admin/ErrorRetry";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

const LIMIT = 20;

type SortColumn = "createdAt" | "lastActiveAt" | "walletBalancePaise";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function WalletModal({
  user,
  onClose,
  onAdjusted,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onAdjusted: (newBalancePaise: number) => void;
}) {
  const [sign, setSign] = useState<WalletAdjustSign>("credit");
  const [magnitude, setMagnitude] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  async function handleSubmit() {
    const delta = computeWalletDeltaPaise(sign, magnitude);
    if (!delta.ok) {
      setError(delta.error);
      return;
    }
    const noteCheck = validateWalletNote(note);
    if (!noteCheck.ok) {
      setError(noteCheck.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminApi.adjustWallet(user.id, { deltaPaise: delta.deltaPaise, note: note.trim() });
      setResult(res.walletBalancePaise);
      onAdjusted(res.walletBalancePaise);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to adjust wallet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={() => !busy && onClose()}
      closeLabel="Close"
      header={
        <h2 className="text-base font-semibold text-foreground">
          Wallet — {user.displayName?.trim() || user.phoneE164 || "User"}
        </h2>
      }
    >
      {result !== null ? (
        <div>
          <p className="text-sm text-muted mb-1">New balance</p>
          <p className="text-2xl font-semibold text-gold mb-5">{formatRupees(result)}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-3 rounded-2xl bg-gold text-black text-sm font-medium"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">Current balance: {formatRupees(user.walletBalancePaise)}</p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSign("credit")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                sign === "credit"
                  ? "border-green-500/50 bg-green-500/10 text-green-400"
                  : "border-border text-muted"
              }`}
            >
              + Grant
            </button>
            <button
              type="button"
              onClick={() => setSign("debit")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                sign === "debit" ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-border text-muted"
              }`}
            >
              − Deduct
            </button>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Amount (₹)</label>
            <input
              type="text"
              inputMode="decimal"
              value={magnitude}
              onChange={(e) => setMagnitude(e.target.value)}
              placeholder="0.00"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Note (required)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Reason for this adjustment"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="w-full px-4 py-3 rounded-2xl bg-gold text-black text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Saving…" : sign === "credit" ? "Grant to wallet" : "Deduct from wallet"}
          </button>
        </div>
      )}
    </BottomSheetModal>
  );
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletTarget, setWalletTarget] = useState<AdminUserRow | null>(null);
  const [sortBy, setSortBy] = useState<SortColumn>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(col: SortColumn) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setOffset(0);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listUsers({ q: debouncedQuery || undefined, offset, limit: LIMIT, sortBy, sortDir })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, [debouncedQuery, offset, sortBy, sortDir]);

  useEffect(() => {
    fetchUsers();
    // The online dot is derived from `lastActiveAt` at render time, so without a
    // refetch it freezes at page-load and keeps claiming someone is online long
    // after they left. Re-poll well inside ONLINE_WINDOW_MS so the dot decays on
    // its own. Cheap: this only ever refetches the 20 rows already on screen,
    // and `loading` is gated on `!users`, so it never flashes the spinner.
    const timer = setInterval(fetchUsers, 60_000);
    return () => clearInterval(timer);
  }, [fetchUsers]);

  function handleAdjusted(userId: string, newBalancePaise: number) {
    setUsers((prev) => prev && prev.map((u) => (u.id === userId ? { ...u, walletBalancePaise: newBalancePaise } : u)));
  }

  const canPrev = offset > 0;
  const canNext = offset + LIMIT < total;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-4">Users</h1>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, phone, email, or user ID…"
        className="w-full max-w-sm bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground mb-6"
      />

      {loading && !users && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchUsers} />}

      {users && !error && (
        <>
          {users.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">No users found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Phone</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort("walletBalancePaise")}
                        className="ml-auto flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Wallet
                        {sortBy === "walletBalancePaise" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("createdAt")}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Created
                        {sortBy === "createdAt" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("lastActiveAt")}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Last Active
                        {sortBy === "lastActiveAt" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{u.displayName ?? "—"}</td>
                      <td className="px-4 py-2 text-foreground">{u.phoneE164 ?? "—"}</td>
                      <td className="px-4 py-2 text-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-foreground">{formatRupees(u.walletBalancePaise)}</td>
                      <td className="px-4 py-2 text-muted">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-2 text-muted">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            title={isUserOnline(u.lastActiveAt) ? "Online now" : "Offline"}
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              isUserOnline(u.lastActiveAt) ? "bg-green-500" : "bg-muted/40"
                            }`}
                          />
                          <span className="sr-only">
                            {isUserOnline(u.lastActiveAt) ? "Online now" : "Offline"}
                          </span>
                          {isUserOnline(u.lastActiveAt) ? (
                            <span className="text-green-400">Online</span>
                          ) : (
                            formatDate(u.lastActiveAt)
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setWalletTarget(u)}
                            className="px-3 py-1.5 rounded-full border border-gold/40 text-gold text-xs hover:bg-gold/10 transition-colors"
                          >
                            Wallet
                          </button>
                          <Link
                            href={`/admin/tickets?userId=${encodeURIComponent(u.id)}`}
                            className="px-3 py-1.5 rounded-full border border-border text-muted text-xs hover:text-foreground transition-colors"
                          >
                            Tickets
                          </Link>
                          <Link
                            href={`/admin?userId=${encodeURIComponent(u.id)}`}
                            className="px-3 py-1.5 rounded-full border border-border text-muted text-xs hover:text-foreground transition-colors"
                          >
                            AI Cost
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-sm text-muted">
            <span>
              {total === 0 ? "0 users" : `${offset + 1}–${Math.min(offset + LIMIT, total)} of ${total}`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                className="px-3 py-1.5 rounded-full border border-border disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setOffset((o) => o + LIMIT)}
                className="px-3 py-1.5 rounded-full border border-border disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {walletTarget && (
        <WalletModal
          user={walletTarget}
          onClose={() => setWalletTarget(null)}
          onAdjusted={(newBalance) => handleAdjusted(walletTarget.id, newBalance)}
        />
      )}
    </div>
  );
}
