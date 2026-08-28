"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  adminApi,
  type AdminGroupRow,
  type AdminGroupMemberRow,
  type AdminGroupFeatureRow,
  type AdminGroupFeatureState,
  type AdminUserRow,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { groupFeaturesByGroup } from "@/lib/admin-format";
import ErrorRetry from "@/components/admin/ErrorRetry";
import FeatureGroupSection from "@/components/admin/FeatureGroupSection";
import FeatureRow from "@/components/admin/FeatureRow";
import ThreeWayToggle from "@/components/admin/ThreeWayToggle";
import ModelSelect from "@/components/admin/ModelSelect";
import Card from "@/components/ui/Card";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function AddMemberControl({ groupId, onAdded }: { groupId: string; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      adminApi
        .listUsers({ q: query.trim(), limit: 10 })
        .then((res) => {
          if (!cancelled) setResults(res.users);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function handleAdd(user: AdminUserRow) {
    setAddingId(user.id);
    setError(null);
    try {
      await adminApi.addGroupMember(groupId, user.id);
      setQuery("");
      setResults([]);
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add member");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="mb-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users by name, phone, or email to add…"
        className="w-full max-w-sm bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
      />
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      {query.trim().length >= 2 && (
        <div className="mt-2 max-w-sm rounded-xl border border-border overflow-hidden">
          {searching ? (
            <p className="text-xs text-muted px-3 py-2">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted px-3 py-2">No matching users.</p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={addingId === u.id}
                onClick={() => handleAdd(u)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface-2 transition-colors disabled:opacity-50 border-t border-border first:border-t-0"
              >
                <span className="text-foreground truncate">{u.displayName ?? u.phoneE164 ?? u.email ?? u.id}</span>
                <span className="text-gold text-xs shrink-0">{addingId === u.id ? "Adding…" : "Add"}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;

  const [group, setGroup] = useState<AdminGroupRow | null>(null);
  const [members, setMembers] = useState<AdminGroupMemberRow[] | null>(null);
  const [features, setFeatures] = useState<AdminGroupFeatureRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingFeatureKeys, setSavingFeatureKeys] = useState<Set<string>>(new Set());
  const [featureErrors, setFeatureErrors] = useState<Record<string, string>>({});

  const fetchAll = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.listGroups().then((res) => res.groups.find((g) => g.id === groupId) ?? null),
      adminApi.listGroupMembers(groupId).then((res) => res.members),
      adminApi.listGroupFeatures(groupId).then((res) => res.features),
    ])
      .then(([g, m, f]) => {
        setGroup(g);
        setMembers(m);
        setFeatures(f);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load group"))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refetchMembers = useCallback(() => {
    adminApi
      .listGroupMembers(groupId)
      .then((res) => setMembers(res.members))
      .catch(() => {
        // Non-fatal — the member list just stays stale until the next full retry.
      });
  }, [groupId]);

  async function handleRemoveMember(userId: string) {
    setRemovingId(userId);
    try {
      await adminApi.removeGroupMember(groupId, userId);
      setMembers((prev) => prev && prev.filter((m) => m.userId !== userId));
    } catch {
      // Leave the member in place — a transient failure shouldn't silently drop them from view.
    } finally {
      setRemovingId(null);
    }
  }

  async function handleFeatureChange(row: AdminGroupFeatureRow, next: AdminGroupFeatureState) {
    if (!features) return;
    const previous = features;
    setSavingFeatureKeys((prev) => new Set(prev).add(row.key));
    setFeatureErrors((prev) => {
      const n = { ...prev };
      delete n[row.key];
      return n;
    });
    setFeatures((fs) => fs && fs.map((f) => (f.key === row.key ? { ...f, state: next } : f)));
    try {
      const updated = await adminApi.updateGroupFeature(groupId, {
        key: row.key,
        enabled: next === "inherit" ? null : next,
      });
      setFeatures((fs) => fs && fs.map((f) => (f.key === row.key ? updated : f)));
    } catch (err) {
      setFeatures(previous);
      setFeatureErrors((prev) => ({
        ...prev,
        [row.key]: err instanceof ApiError ? err.message : "Failed to update override",
      }));
    } finally {
      setSavingFeatureKeys((prev) => {
        const n = new Set(prev);
        n.delete(row.key);
        return n;
      });
    }
  }

  /**
   * A group model choice only applies while the group's own override is `true` — 'inherit'/false
   * both mean "this group has no opinion, defer to the global model" (see
   * admin-groups.service.ts#listGroupFeaturesForAdmin's own doc comment on the `model` field), so
   * `enabled: true` is always sent here rather than echoing `row.state`.
   */
  async function handleModelChange(row: AdminGroupFeatureRow, nextModel: string) {
    if (!features) return;
    const previous = features;
    setSavingFeatureKeys((prev) => new Set(prev).add(row.key));
    setFeatureErrors((prev) => {
      const n = { ...prev };
      delete n[row.key];
      return n;
    });
    setFeatures((fs) => fs && fs.map((f) => (f.key === row.key ? { ...f, model: nextModel } : f)));
    try {
      const updated = await adminApi.updateGroupFeature(groupId, {
        key: row.key,
        enabled: true,
        model: nextModel,
      });
      setFeatures((fs) => fs && fs.map((f) => (f.key === row.key ? updated : f)));
    } catch (err) {
      setFeatures(previous);
      setFeatureErrors((prev) => ({
        ...prev,
        [row.key]: err instanceof ApiError ? err.message : "Failed to update model",
      }));
    } finally {
      setSavingFeatureKeys((prev) => {
        const n = new Set(prev);
        n.delete(row.key);
        return n;
      });
    }
  }

  if (loading && !members) return <p className="text-sm text-muted text-center py-10">Loading…</p>;
  if (error) return <ErrorRetry message={error} onRetry={fetchAll} />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-1">{group?.name ?? "Group"}</h1>
      {group?.description && <p className="text-sm text-muted mb-6">{group.description}</p>}
      {!group?.description && <div className="mb-6" />}

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">Members</h2>
        <AddMemberControl groupId={groupId} onAdded={refetchMembers} />
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-muted uppercase tracking-wide">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Added</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {members && members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-6">
                    No members yet.
                  </td>
                </tr>
              ) : (
                members?.map((m) => (
                  <tr key={m.userId} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{m.displayName ?? "—"}</td>
                    <td className="px-4 py-2 text-foreground">{m.phoneE164 ?? "—"}</td>
                    <td className="px-4 py-2 text-muted">{formatDate(m.addedAt)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        disabled={removingId === m.userId}
                        onClick={() => handleRemoveMember(m.userId)}
                        className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {removingId === m.userId ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground mb-1">Feature Overrides</h2>
        <p className="text-[11px] text-muted mb-3">
          Inherit (muted) means this group follows the global switch. On/Off (colored) is an explicit override for
          just this group's members.
        </p>
        {features &&
          groupFeaturesByGroup(features).map(({ group: groupKey, items }) => (
            <FeatureGroupSection key={groupKey} group={groupKey}>
              {items.map((row) => (
                <FeatureRow
                  key={row.key}
                  label={row.label}
                  featureKey={row.key}
                  error={featureErrors[row.key]}
                  priceEditor={
                    // Only meaningful once this group's own override is explicitly on — see
                    // handleModelChange's doc comment.
                    row.modelOptions.length > 0 && row.state === true ? (
                      <ModelSelect
                        id={`group-model-${row.key}`}
                        value={row.model}
                        options={row.modelOptions}
                        disabled={savingFeatureKeys.has(row.key)}
                        onChange={(next) => handleModelChange(row, next)}
                      />
                    ) : undefined
                  }
                  control={
                    <ThreeWayToggle
                      value={row.state}
                      disabled={savingFeatureKeys.has(row.key)}
                      onChange={(next) => handleFeatureChange(row, next)}
                    />
                  }
                />
              ))}
            </FeatureGroupSection>
          ))}
      </section>
    </div>
  );
}
