"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see ../layout.tsx).

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import type { AdminSkyItem } from "@/lib/same-sky";
import ErrorRetry from "@/components/admin/ErrorRetry";

/** Why the automatic check left a post for a person, in plain words. */
function reasonText(item: AdminSkyItem): string {
  const r = item.checkReason ?? "";
  if (r === "reported") return `Reported by ${item.reportCount} readers`;
  if (r.startsWith("policy:")) return `Content policy: ${r.slice(7)}`;
  if (r.startsWith("model:")) return `Automatic check unsure: ${r.slice(6) || "no reason given"}`;
  if (r === "model-unavailable" || r === "model-unreadable") return "Automatic check could not run";
  return r || "Waiting for a decision";
}

export default function AdminSkyPage() {
  const [items, setItems] = useState<AdminSkyItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    adminApi
      .skyQueue()
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load the queue"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, action: "approve" | "reject" | "remove") {
    setBusyId(id);
    try {
      await adminApi.skyDecide(id, action);
      setItems((list) => (list ? list.filter((i) => i.id !== id) : list));
      setTotal((n) => Math.max(0, n - 1));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-1">Same Sky</h1>
      <p className="text-sm text-muted mb-4">
        Posts the automatic check left for a person, and approved posts readers reported (switch{" "}
        <code>community.sameSky</code>). Approve to publish, reject to keep it from showing, remove to take down a
        published post. Authors are never named; each shows only as a room handle.
      </p>

      {error && <ErrorRetry message={error} onRetry={load} />}

      {items && !error && (
        <p className="text-xs text-muted mb-3" data-testid="admin-sky-total">
          {total} waiting
        </p>
      )}

      {items && items.length === 0 && !error && (
        <p className="py-8 text-center text-sm text-muted" data-testid="admin-sky-empty">
          Nothing waiting. Every post has been decided.
        </p>
      )}

      <div className="space-y-3">
        {items?.map((item) => (
          <div key={item.id} className="rounded-xl border border-gold/15 bg-card p-4 space-y-2" data-testid="admin-sky-item">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded-full border border-gold/30 px-2 py-0.5 text-gold">{item.room}</span>
              <span>{item.handle}</span>
              <span>{new Date(item.createdAt).toLocaleString("en-IN")}</span>
              <span className="ml-auto">{item.status === "APPROVED" ? "Published, reported" : "Waiting"}</span>
            </div>
            <p className="whitespace-pre-line break-words text-sm text-foreground">{item.body}</p>
            <p className="text-xs text-muted">{reasonText(item)}</p>
            {item.reasons.length > 0 && <p className="text-xs text-muted">Report reasons: {item.reasons.join(", ")}</p>}
            <div className="flex gap-2 pt-1">
              {item.status === "PENDING" && (
                <button
                  type="button"
                  data-testid="admin-sky-approve"
                  disabled={busyId === item.id}
                  onClick={() => void decide(item.id, "approve")}
                  className="h-9 rounded-lg bg-gold/20 px-4 text-sm font-medium text-gold disabled:opacity-50"
                >
                  Approve
                </button>
              )}
              {item.status === "PENDING" && (
                <button
                  type="button"
                  data-testid="admin-sky-reject"
                  disabled={busyId === item.id}
                  onClick={() => void decide(item.id, "reject")}
                  className="h-9 rounded-lg border border-gold/25 px-4 text-sm disabled:opacity-50"
                >
                  Reject
                </button>
              )}
              <button
                type="button"
                data-testid="admin-sky-remove"
                disabled={busyId === item.id}
                onClick={() => void decide(item.id, "remove")}
                className="h-9 rounded-lg border border-red-400/40 px-4 text-sm text-red-300 disabled:opacity-50"
              >
                Remove
              </button>
              {item.status === "APPROVED" && (
                <button
                  type="button"
                  data-testid="admin-sky-keep"
                  disabled={busyId === item.id}
                  onClick={() => void decide(item.id, "approve")}
                  className="h-9 rounded-lg border border-gold/25 px-4 text-sm disabled:opacity-50"
                >
                  Keep it
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
