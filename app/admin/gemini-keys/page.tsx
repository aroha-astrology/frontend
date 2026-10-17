"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see layout.tsx).

import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  type AdminGeminiKeyRow,
  type GeminiKeyTier,
  type GeminiKeyTestResult,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import ErrorRetry from "@/components/admin/ErrorRetry";
import ConfirmModal from "@/components/admin/ConfirmModal";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function TierToggle({ value, onChange }: { value: GeminiKeyTier; onChange: (tier: GeminiKeyTier) => void }) {
  return (
    <div className="flex gap-2">
      {(["free", "paid"] as const).map((tier) => (
        <button
          key={tier}
          type="button"
          onClick={() => onChange(tier)}
          className={`flex-1 py-2 rounded-xl text-xs font-medium border ${value === tier ? "bg-gold text-black border-gold" : "border-border text-muted"}`}
        >
          {tier === "free" ? "Free tier" : "Paid tier"}
        </button>
      ))}
    </div>
  );
}

function AddKeyModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (row: AdminGeminiKeyRow, test: GeminiKeyTestResult | null) => void;
}) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<GeminiKeyTier>("free");
  const [key, setKey] = useState("");
  const [testAfter, setTestAfter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !key.trim()) {
      setError("A name and the key are both needed");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const row = await adminApi.addGeminiKey({ name: name.trim(), tier, key: key.trim() });
      let test: GeminiKeyTestResult | null = null;
      if (testAfter) {
        test = await adminApi.testGeminiKey(row.id).catch(() => null);
      }
      onAdded(row, test);
    } catch (err) {
      setError(errorText(err, "Could not add the key"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={() => !busy && onClose()}
      closeLabel="Close"
      header={<h2 className="text-base font-semibold text-foreground">Add a Gemini key</h2>}
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted block mb-1">Name (shown on this page and in alerts)</label>
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. subir3"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-2">Tier</label>
          <TierToggle value={tier} onChange={setTier} />
          <p className="text-xs text-muted mt-2">
            {tier === "free"
              ? "Free keys are used first and take turns."
              : "Paid keys are used only after every free key runs out. A new paid key goes last in the order."}
          </p>
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">API key</label>
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste the key from Google AI Studio"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground font-mono"
          />
          <p className="text-xs text-muted mt-1">Stored encrypted on the server. Only its last 4 characters are shown here.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={testAfter} onChange={(e) => setTestAfter(e.target.checked)} />
          Test the key right after adding it
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="w-full px-4 py-3 rounded-2xl bg-gold text-black text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add key"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

function RenameModal({
  row,
  onClose,
  onSaved,
}: {
  row: AdminGeminiKeyRow;
  onClose: () => void;
  onSaved: (row: AdminGeminiKeyRow) => void;
}) {
  const [name, setName] = useState(row.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await adminApi.updateGeminiKey(row.id, { name: name.trim() }));
    } catch (err) {
      setError(errorText(err, "Could not rename the key"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={() => !busy && onClose()}
      closeLabel="Close"
      header={<h2 className="text-base font-semibold text-foreground">Rename {row.name}</h2>}
    >
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !name.trim()}
          className="w-full px-4 py-3 rounded-2xl bg-gold text-black text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

function Badge({ children, tone }: { children: string; tone: "green" | "grey" | "amber" | "red" }) {
  const tones = {
    green: "bg-green-500/15 text-green-400",
    grey: "bg-white/10 text-muted",
    amber: "bg-amber-500/15 text-amber-400",
    red: "bg-red-500/15 text-red-400",
  };
  return <span className={`text-[11px] px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}

const smallButton =
  "px-3 py-1.5 rounded-full border border-border text-foreground text-xs disabled:opacity-50 hover:bg-white/5 transition-colors";

function KeyCard({
  row,
  busy,
  test,
  onTest,
  onToggle,
  onUseFirst,
  onMoveTier,
  onRename,
  onDelete,
}: {
  row: AdminGeminiKeyRow;
  busy: boolean;
  test: GeminiKeyTestResult | undefined;
  onTest: () => void;
  onToggle: () => void;
  onUseFirst: () => void;
  onMoveTier: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const lastOk = test ? test.ok : row.lastTestOk;
  const lastMessage = test ? test.message : row.lastTestMessage;
  return (
    <div
      data-testid={`gemini-key-${row.id}`}
      className={`rounded-2xl border border-border p-4 ${row.enabled ? "" : "opacity-60"}`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        {row.paidPosition !== null && (
          <span className="text-xs font-semibold text-gold">#{row.paidPosition}</span>
        )}
        <span data-testid="gemini-key-name" className="font-medium text-foreground break-all">
          {row.name}
        </span>
        <span className="text-xs text-muted font-mono">••••{row.last4}</span>
        <Badge tone={row.enabled ? "green" : "grey"}>{row.enabled ? "On" : "Off"}</Badge>
        <Badge tone="grey">{row.source === "env" ? "from .env" : "added here"}</Badge>
        {row.coolingDown && <Badge tone="amber">Resting after rate limit</Badge>}
        {!row.available && <Badge tone="red">No longer in .env</Badge>}
      </div>

      <p className="text-xs text-muted mb-3">
        {lastOk === null || lastOk === undefined ? (
          "Not tested yet"
        ) : (
          <>
            <span className={lastOk ? "text-green-400" : "text-red-400"}>{lastOk ? "✅ " : "❌ "}</span>
            {lastMessage}
            {!test && row.lastTestedAt ? ` · ${formatDateTime(row.lastTestedAt)}` : ""}
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onTest} disabled={busy || !row.available} className={smallButton}>
          {busy ? "Working…" : "Test"}
        </button>
        <button type="button" onClick={onToggle} disabled={busy || !row.available} className={smallButton}>
          {row.enabled ? "Switch off" : "Switch on"}
        </button>
        {row.tier === "paid" && row.paidPosition !== 1 && (
          <button type="button" onClick={onUseFirst} disabled={busy} className={smallButton}>
            Use this first
          </button>
        )}
        <button type="button" onClick={onMoveTier} disabled={busy} className={smallButton}>
          {row.tier === "free" ? "Move to paid" : "Move to free"}
        </button>
        <button type="button" onClick={onRename} disabled={busy} className={smallButton}>
          Rename
        </button>
        {(row.source === "admin" || !row.available) && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminGeminiKeysPage() {
  const [keys, setKeys] = useState<AdminGeminiKeyRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, GeminiKeyTestResult>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [renameTarget, setRenameTarget] = useState<AdminGeminiKeyRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminGeminiKeyRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  const fetchKeys = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listGeminiKeys()
      .then((res) => setKeys(res.keys))
      .catch((err) => setError(errorText(err, "Failed to load keys")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  /** Runs one action on a key, then reloads the list so order and badges stay true. */
  async function run(id: string, action: () => Promise<unknown>, fallback: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      const res = await adminApi.listGeminiKeys();
      setKeys(res.keys);
    } catch (err) {
      setActionError(errorText(err, fallback));
    } finally {
      setBusyId(null);
    }
  }

  function handleTest(row: AdminGeminiKeyRow) {
    return run(
      row.id,
      async () => {
        const result = await adminApi.testGeminiKey(row.id);
        setTests((prev) => ({ ...prev, [row.id]: result }));
      },
      "Could not test the key",
    );
  }

  async function handleTestAll() {
    if (!keys) return;
    setTestingAll(true);
    for (const row of keys.filter((k) => k.enabled && k.available)) {
      await handleTest(row);
    }
    setTestingAll(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await adminApi.deleteGeminiKey(deleteTarget.id);
      setKeys((prev) => prev && prev.filter((k) => k.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(errorText(err, "Could not delete the key"));
    } finally {
      setDeleteBusy(false);
    }
  }

  const free = keys?.filter((k) => k.tier === "free") ?? [];
  const paid = keys?.filter((k) => k.tier === "paid") ?? [];

  function card(row: AdminGeminiKeyRow) {
    return (
      <KeyCard
        key={row.id}
        row={row}
        busy={busyId === row.id}
        test={tests[row.id]}
        onTest={() => handleTest(row)}
        onToggle={() =>
          run(row.id, () => adminApi.updateGeminiKey(row.id, { enabled: !row.enabled }), "Could not change the key")
        }
        onUseFirst={() => run(row.id, () => adminApi.useGeminiKeyFirst(row.id), "Could not change the order")}
        onMoveTier={() =>
          run(
            row.id,
            () => adminApi.updateGeminiKey(row.id, { tier: row.tier === "free" ? "paid" : "free" }),
            "Could not move the key",
          )
        }
        onRename={() => setRenameTarget(row)}
        onDelete={() => setDeleteTarget(row)}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="text-xl font-semibold text-gold">Gemini Keys</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTestAll}
            disabled={!keys || testingAll || busyId !== null}
            className="px-4 py-2 rounded-full border border-border text-foreground text-sm disabled:opacity-50"
          >
            {testingAll ? "Testing…" : "Test all"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-full bg-gold text-black text-sm font-medium"
          >
            Add key
          </button>
        </div>
      </div>
      <p className="text-xs text-muted mb-6 max-w-2xl">
        Free keys are used first and take turns. Once every free key is out of quota, paid keys are used in
        order, #1 first. A switched-off key is never used. Changes reach every server within 30 seconds. Test
        sends one tiny real request, so a paid key is billed a few tokens for it.
      </p>

      {loading && !keys && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchKeys} />}
      {actionError && <p className="text-sm text-red-400 mb-3">{actionError}</p>}

      {keys && !error && (
        <div className="space-y-8">
          <section data-testid="gemini-keys-free">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Free tier <span className="text-muted font-normal">({free.filter((k) => k.enabled).length} on)</span>
            </h2>
            {free.length === 0 ? (
              <p className="text-sm text-muted">No free keys.</p>
            ) : (
              <div className="space-y-3">{free.map(card)}</div>
            )}
          </section>
          <section data-testid="gemini-keys-paid">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Paid tier <span className="text-muted font-normal">(used in this order)</span>
            </h2>
            {paid.length === 0 ? (
              <p className="text-sm text-muted">No paid keys.</p>
            ) : (
              <div className="space-y-3">{paid.map(card)}</div>
            )}
          </section>
        </div>
      )}

      {showAdd && (
        <AddKeyModal
          onClose={() => setShowAdd(false)}
          onAdded={(row, test) => {
            setShowAdd(false);
            if (test) setTests((prev) => ({ ...prev, [row.id]: test }));
            fetchKeys();
          }}
        />
      )}

      {renameTarget && (
        <RenameModal
          row={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSaved={(row) => {
            setKeys((prev) => prev && prev.map((k) => (k.id === row.id ? row : k)));
            setRenameTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete key"
          body={
            <>
              Delete <strong className="text-foreground">{deleteTarget.name}</strong> (••••{deleteTarget.last4})?
              The app stops using it at once. To use it again you would paste it again.
            </>
          }
          confirmLabel="Delete key"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
