"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see layout.tsx).

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminVarshikTier } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import ErrorRetry from "@/components/admin/ErrorRetry";

/** What the form holds for one tier: money in rupees, lists as one line per item. */
interface Draft {
  displayName: string;
  subtitle: string;
  badgeText: string;
  priceRupees: string;
  originalRupees: string;
  pageCount: string;
  shortDescription: string;
  features: string;
  excludes: string;
  isPopular: boolean;
  isActive: boolean;
}

const toDraft = (t: AdminVarshikTier): Draft => ({
  displayName: t.displayName,
  subtitle: t.subtitle,
  badgeText: t.badgeText ?? "",
  priceRupees: String(t.pricePaise / 100),
  originalRupees: t.originalPricePaise === null ? "" : String(t.originalPricePaise / 100),
  pageCount: String(t.pageCount),
  shortDescription: t.shortDescription,
  features: t.features.join("\n"),
  excludes: t.excludes.join("\n"),
  isPopular: t.isPopular,
  isActive: t.isActive,
});

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const rupeesToPaise = (s: string) => Math.round(Number(s) * 100);

const WHAT_THEY_SEE: Record<AdminVarshikTier["tierSlug"], string> = {
  basic: "Snapshot: the charts and the scores, no written deep dives, no month pages.",
  gold: "Gold: everything except the month-by-month pages.",
  complete: "Sampoorna: the whole report.",
};

const inputClass = "w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted/80">{hint}</span>}
    </label>
  );
}

function TierCard({ tier, onSaved }: { tier: AdminVarshikTier; onSaved: (t: AdminVarshikTier) => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(tier));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    const price = rupeesToPaise(draft.priceRupees);
    const original = draft.originalRupees.trim() === "" ? null : rupeesToPaise(draft.originalRupees);
    const pages = Number(draft.pageCount);
    if (!Number.isFinite(price) || price < 0) return setMessage({ ok: false, text: "Price must be a number of rupees, 0 or more." });
    if (original !== null && (!Number.isFinite(original) || original < price)) {
      return setMessage({ ok: false, text: "The struck-out price must be a number at least as high as the price (or empty)." });
    }
    if (!Number.isInteger(pages) || pages < 1) return setMessage({ ok: false, text: "Page count must be a whole number, 1 or more." });
    setSaving(true);
    setMessage(null);
    try {
      const saved = await adminApi.updateVarshikTier(tier.tierSlug, {
        displayName: draft.displayName,
        subtitle: draft.subtitle,
        badgeText: draft.badgeText.trim() === "" ? null : draft.badgeText.trim(),
        pricePaise: price,
        originalPricePaise: original,
        pageCount: pages,
        shortDescription: draft.shortDescription,
        features: lines(draft.features),
        excludes: lines(draft.excludes),
        isPopular: draft.isPopular,
        isActive: draft.isActive,
      });
      setDraft(toDraft(saved));
      onSaved(saved);
      setMessage({ ok: true, text: "Saved. Readers see it the next time they open the report list." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border p-4 flex flex-col gap-3" data-testid={`varshik-tier-${tier.tierSlug}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-gold">{tier.tierSlug}</h2>
        <span className="text-[11px] text-muted">Last changed {new Date(tier.updatedAt).toLocaleString()}</span>
      </div>
      <p className="text-xs text-muted">{WHAT_THEY_SEE[tier.tierSlug]}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Price (₹)" hint="What the reader pays, before any Aroha Pass discount.">
          <input className={inputClass} inputMode="decimal" value={draft.priceRupees} onChange={(e) => set("priceRupees", e.target.value)} />
        </Field>
        <Field label="Struck-out price (₹)" hint="Shown crossed out. Leave empty for none.">
          <input className={inputClass} inputMode="decimal" value={draft.originalRupees} onChange={(e) => set("originalRupees", e.target.value)} />
        </Field>
        <Field label="Page count shown" hint="The number on the card. Gold and Sampoorna show it with a +.">
          <input className={inputClass} inputMode="numeric" value={draft.pageCount} onChange={(e) => set("pageCount", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name">
          <input className={inputClass} value={draft.displayName} onChange={(e) => set("displayName", e.target.value)} maxLength={60} />
        </Field>
        <Field label="Badge (optional)" hint="e.g. MOST POPULAR">
          <input className={inputClass} value={draft.badgeText} onChange={(e) => set("badgeText", e.target.value)} maxLength={40} />
        </Field>
      </div>
      <Field label="Subtitle">
        <input className={inputClass} value={draft.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={120} />
      </Field>
      <Field label="Short description" hint="One or two lines shown when the tier is selected.">
        <textarea className={inputClass} rows={3} value={draft.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={600} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="What is included (one per line)">
          <textarea className={inputClass} rows={5} value={draft.features} onChange={(e) => set("features", e.target.value)} />
        </Field>
        <Field label="What is not included (one per line, optional)">
          <textarea className={inputClass} rows={5} value={draft.excludes} onChange={(e) => set("excludes", e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={draft.isPopular} onChange={(e) => set("isPopular", e.target.checked)} />
          Highlight as the popular choice
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          On sale
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-full bg-gold text-black text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message && <p className={`text-sm ${message.ok ? "text-green-400" : "text-red-400"}`}>{message.text}</p>}
      </div>
    </section>
  );
}

export default function AdminVarshikPricingPage() {
  const [tiers, setTiers] = useState<AdminVarshikTier[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    adminApi
      .varshikTiers()
      .then((r) => setTiers(r.tiers))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load the Varshik tiers"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-3">Varshik Rashifal pricing</h1>
      <p className="text-xs text-muted mb-4 max-w-2xl">
        Varshik Rashifal 2027 is sold in three tiers. The report is always written in full; the tier only decides which
        pages the reader sees. The price you save here is the price charged (the server never takes a price from the
        app). Aroha Pass discounts still apply. Switch the whole report on or off on Features → reports.varshik_rashifal_2027.
      </p>
      {error && <ErrorRetry message={error} onRetry={load} />}
      {!tiers && !error && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {tiers && !error && (
        <div className="flex flex-col gap-4">
          {tiers.map((t) => (
            <TierCard key={t.tierSlug} tier={t} onSaved={(saved) => setTiers((all) => all?.map((x) => (x.tierSlug === saved.tierSlug ? saved : x)) ?? null)} />
          ))}
        </div>
      )}
    </div>
  );
}
