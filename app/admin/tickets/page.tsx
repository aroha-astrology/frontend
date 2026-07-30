"use client";

// Deliberate i18n exception, same as the rest of /admin (see app/admin/layout.tsx) —
// this page stays plain hardcoded English. Do NOT add admin.* i18n keys here.

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminApi, type AdminSupportTicket } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import ErrorRetry from "@/components/admin/ErrorRetry";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

const LIMIT = 20;

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_EDIT_OPTIONS = STATUS_FILTER_OPTIONS.filter((o) => o.value !== "");

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Same tone convention as the customer-facing app/help/page.tsx's statusTone, kept independent since this file is hardcoded-English and that one is i18n'd. */
function statusTone(status: string): string {
  if (status === "resolved") return "border-green-500/40 bg-green-500/10 text-green-400";
  if (status === "closed") return "border-border bg-surface text-muted";
  if (status === "in_progress") return "border-blue-500/40 bg-blue-500/10 text-blue-400";
  return "border-gold/40 bg-gold/10 text-gold"; // open / unknown
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed;
}

function TicketModal({
  ticket,
  onClose,
  onUpdated,
}: {
  ticket: AdminSupportTicket;
  onClose: () => void;
  onUpdated: (updated: AdminSupportTicket) => void;
}) {
  const [status, setStatus] = useState(ticket.status);
  const [adminNote, setAdminNote] = useState(ticket.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const body: { status?: string; adminNote?: string } = {};
    if (status !== ticket.status) body.status = status;
    if (adminNote !== (ticket.adminNote ?? "")) body.adminNote = adminNote;
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await adminApi.updateSupportTicket(ticket.id, body);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={() => !busy && onClose()}
      closeLabel="Close"
      header={<h2 className="text-base font-semibold text-foreground">Ticket — {ticket.category}</h2>}
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted mb-1">User ID</p>
          <p className="text-sm text-foreground break-all" title={ticket.userId}>
            {ticket.userId}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted mb-1">Message</p>
          <p className="text-sm text-foreground whitespace-pre-wrap bg-surface border border-border rounded-xl px-3 py-2">
            {ticket.message}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted mb-0.5">Locale</p>
            <p className="text-foreground">{ticket.locale ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted mb-0.5">App version</p>
            <p className="text-foreground">{ticket.appVersion ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted mb-0.5">Created</p>
            <p className="text-foreground">{formatDate(ticket.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted mb-0.5">Resolved</p>
            <p className="text-foreground">{formatDate(ticket.resolvedAt)}</p>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          >
            {STATUS_EDIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Admin note</label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Internal note (not visible to the user)"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="w-full px-4 py-3 rounded-2xl bg-gold text-black text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

function AdminTicketsPageInner() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId") ?? "";

  const [userIdInput, setUserIdInput] = useState(userIdParam);
  const [debouncedUserId, setDebouncedUserId] = useState(userIdParam);
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [tickets, setTickets] = useState<AdminSupportTicket[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AdminSupportTicket | null>(null);

  // Debounce manual edits to the userId filter box, matching app/admin/users/page.tsx's search debounce.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserId(userIdInput);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [userIdInput]);

  // If the ?userId= deep-link param itself changes (e.g. a fresh link while this page is
  // already mounted), sync immediately rather than waiting on the debounce timer.
  useEffect(() => {
    setUserIdInput(userIdParam);
    setDebouncedUserId(userIdParam);
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdParam]);

  const fetchTickets = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listSupportTickets({ userId: debouncedUserId || undefined, status: status || undefined, offset, limit: LIMIT })
      .then((res) => {
        setTickets(res.tickets);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load tickets"))
      .finally(() => setLoading(false));
  }, [debouncedUserId, status, offset]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  function handleUpdated(updated: AdminSupportTicket) {
    setTickets((prev) => prev && prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditTarget(null);
  }

  const canPrev = offset > 0;
  const canNext = offset + LIMIT < total;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-4">Support Tickets</h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          placeholder="Filter by user id…"
          className="w-full max-w-sm bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setOffset(0);
          }}
          className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {userIdInput && (
          <button
            type="button"
            onClick={() => setUserIdInput("")}
            className="px-3 py-1.5 rounded-full border border-border text-muted text-xs hover:text-foreground transition-colors"
          >
            Clear user filter
          </button>
        )}
      </div>

      {loading && !tickets && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchTickets} />}

      {tickets && !error && (
        <>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">No tickets found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Message</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground font-mono text-xs" title={ticket.userId}>
                        {truncate(ticket.userId, 12)}
                      </td>
                      <td className="px-4 py-2 text-foreground">{ticket.category}</td>
                      <td className="px-4 py-2 text-muted max-w-xs truncate">{truncate(ticket.message, 60)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusTone(
                            ticket.status,
                          )}`}
                        >
                          {statusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted">{formatDate(ticket.createdAt)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setEditTarget(ticket)}
                          className="px-3 py-1.5 rounded-full border border-gold/40 text-gold text-xs hover:bg-gold/10 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-sm text-muted">
            <span>
              {total === 0 ? "0 tickets" : `${offset + 1}–${Math.min(offset + LIMIT, total)} of ${total}`}
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

      {editTarget && (
        <TicketModal ticket={editTarget} onClose={() => setEditTarget(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={null}>
      <AdminTicketsPageInner />
    </Suspense>
  );
}
