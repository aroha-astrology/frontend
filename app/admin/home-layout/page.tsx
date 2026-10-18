"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see ../layout.tsx).

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import {
  HOME_CARDS,
  SLOT_LABELS,
  SLOT_NAMES,
  completeOrder,
  defaultHomeLayout,
  type HomeLayoutDoc,
  type LookLayout,
  type StoredHomeLayout,
} from "@/lib/home-cards";
import ErrorRetry from "@/components/admin/ErrorRetry";
import HomeLookEditor from "@/components/admin/HomeLookEditor";

/** The layout to start editing from: the draft, else what is published, else the built-in order. Every card is listed. */
function startingDoc(stored: StoredHomeLayout): HomeLayoutDoc {
  const base = stored.draft ?? stored.published ?? defaultHomeLayout();
  const fix = (look: LookLayout): LookLayout => ({ ...look, order: completeOrder(look.order) });
  return { ...base, vedic: fix(base.vedic), cosmic: fix(base.cosmic) };
}

export default function AdminHomeLayoutPage() {
  const [stored, setStored] = useState<StoredHomeLayout | null>(null);
  const [doc, setDoc] = useState<HomeLayoutDoc | null>(null);
  const [dirty, setDirty] = useState(false);
  const [switchedOff, setSwitchedOff] = useState<ReadonlySet<string>>(new Set());
  const [switchOn, setSwitchOn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([adminApi.homeLayout(), adminApi.listFeatures()])
      .then(([layout, features]) => {
        setStored(layout);
        setDoc(startingDoc(layout));
        setDirty(false);
        const byKey = new Map(features.features.map((f) => [f.key, f.enabled]));
        setSwitchedOff(new Set(HOME_CARDS.filter((c) => byKey.get(c.featureKey) === false).map((c) => c.id)));
        setSwitchOn(byKey.get("experience.homeLayout") ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load the layout"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = useMemo(
    () => async (action: () => Promise<StoredHomeLayout>, done: string, resetDoc: boolean) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const next = await action();
        setStored(next);
        if (resetDoc) setDoc(startingDoc(next));
        setDirty(false);
        setNotice(done);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "That did not work");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (error && !stored) return <ErrorRetry message={error} onRetry={load} />;
  if (!stored || !doc) return null;

  function setLook(which: "vedic" | "cosmic", look: LookLayout) {
    setDoc((d) => (d ? { ...d, [which]: look } : d));
    setDirty(true);
  }

  function setSlotTime(slot: (typeof SLOT_NAMES)[number], value: string) {
    setDoc((d) => (d ? { ...d, slots: { ...d.slots, [slot]: value } } : d));
    setDirty(true);
  }

  const hasDraft = stored.draft !== null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Home layout</h1>
        <p className="mt-1 text-sm text-muted">
          Choose the order of the cards on Home, separately for the Indian look and the international look, and which
          card leads at each time of day. Save a draft to try it: only your test group sees a draft. Publish when you
          are happy.
        </p>
        <p className="mt-2 text-xs text-muted" data-testid="layout-switch-state">
          {switchOn
            ? "The layout switch is ON for everyone: published changes reach all users."
            : "The layout switch is OFF for everyone. Turn it on for a test group (Groups) to see a draft, or for everyone in Features → Experience to go live."}
        </p>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-gold">{notice}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <HomeLookEditor
          title="Indian look (Classic Vedic)"
          testId="look-vedic"
          look={doc.vedic}
          switchedOff={switchedOff}
          onChange={(look) => setLook("vedic", look)}
        />
        <HomeLookEditor
          title="International look (Modern Cosmic)"
          testId="look-cosmic"
          look={doc.cosmic}
          switchedOff={switchedOff}
          onChange={(look) => setLook("cosmic", look)}
        />
      </div>

      <section className="rounded-2xl border border-border bg-surface/40 p-4">
        <h2 className="text-base font-semibold text-foreground mb-1">When each time of day starts</h2>
        <p className="text-xs text-muted mb-3">The user&apos;s own clock. Before the morning time it still counts as night.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SLOT_NAMES.map((slot) => (
            <label key={slot} className="block text-xs text-muted">
              {SLOT_LABELS[slot]}
              <input
                type="time"
                data-testid={`slot-${slot}`}
                value={doc.slots[slot]}
                onChange={(e) => setSlotTime(slot, e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="save-draft"
          disabled={busy || !dirty}
          onClick={() => run(() => adminApi.saveHomeLayoutDraft(doc), "Draft saved. Your test group can see it.", false)}
          className="px-4 py-2.5 rounded-2xl bg-gold text-black text-sm font-medium disabled:opacity-40"
        >
          Save draft
        </button>
        <button
          type="button"
          data-testid="publish"
          disabled={busy || dirty || !hasDraft}
          onClick={() => run(() => adminApi.publishHomeLayout(), "Published.", false)}
          className="px-4 py-2.5 rounded-2xl border border-gold text-gold text-sm font-medium disabled:opacity-40"
        >
          Publish the draft
        </button>
        <button
          type="button"
          data-testid="discard-draft"
          disabled={busy || !hasDraft}
          onClick={() => run(() => adminApi.discardHomeLayoutDraft(), "Draft thrown away.", true)}
          className="px-4 py-2.5 rounded-2xl border border-border text-muted text-sm disabled:opacity-40"
        >
          Throw the draft away
        </button>
        <button
          type="button"
          data-testid="undo"
          disabled={busy || stored.previous === null}
          onClick={() => run(() => adminApi.undoHomeLayout(), "Went back to the layout before the last publish.", false)}
          className="px-4 py-2.5 rounded-2xl border border-border text-muted text-sm disabled:opacity-40"
        >
          Undo last publish
        </button>
      </div>
      {dirty && <p className="text-xs text-muted">You have changes that are not saved. Save the draft before publishing.</p>}
    </div>
  );
}
