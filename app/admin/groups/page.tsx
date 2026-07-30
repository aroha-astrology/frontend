"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminGroupRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { validateGroupName } from "@/lib/admin-format";
import ErrorRetry from "@/components/admin/ErrorRetry";
import ConfirmModal from "@/components/admin/ConfirmModal";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function NewGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (group: AdminGroupRow) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const nameCheck = validateGroupName(name);
    if (!nameCheck.ok) {
      setError(nameCheck.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const group = await adminApi.createGroup({ name: name.trim(), description: description.trim() || null });
      onCreated(group);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={() => !busy && onClose()}
      closeLabel="Close"
      header={<h2 className="text-base font-semibold text-foreground">New Group</h2>}
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Beta Testers"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
          {busy ? "Creating…" : "Create Group"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<AdminGroupRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminGroupRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchGroups = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listGroups()
      .then((res) => setGroups(res.groups))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load groups"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await adminApi.deleteGroup(deleteTarget.id);
      setGroups((prev) => prev && prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete group");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gold">Groups</h1>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-full bg-gold text-black text-sm font-medium"
        >
          New Group
        </button>
      </div>

      {loading && !groups && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchGroups} />}

      {groups && !error && (
        <>
          {groups.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">
              No groups yet. Create one to target a feature at a specific cohort of users.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Description</th>
                    <th className="px-4 py-2 font-medium text-right">Members</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <Link href={`/admin/groups/${g.id}`} className="text-gold hover:underline font-medium">
                          {g.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-muted">{g.description ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-foreground">{g.memberCount}</td>
                      <td className="px-4 py-2 text-muted">{formatDate(g.createdAt)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(g)}
                          className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showNew && (
        <NewGroupModal
          onClose={() => setShowNew(false)}
          onCreated={(group) => {
            setGroups((prev) => (prev ? [group, ...prev] : [group]));
            setShowNew(false);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Group"
          body={
            <>
              Delete <strong className="text-foreground">{deleteTarget.name}</strong>? This removes all{" "}
              {deleteTarget.memberCount} member{deleteTarget.memberCount === 1 ? "" : "s"} and every feature override
              for this group. This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
