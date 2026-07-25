"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminFeatureRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { groupFeaturesByGroup, paiseToRupeeInput, validatePriceInput } from "@/lib/admin-format";
import Switch from "@/components/ui/Switch";
import ErrorRetry from "@/components/admin/ErrorRetry";
import FeatureGroupSection from "@/components/admin/FeatureGroupSection";
import FeatureRow from "@/components/admin/FeatureRow";

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<AdminFeatureRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const fetchFeatures = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listFeatures()
      .then((res) => {
        setFeatures(res.features);
        setPriceDrafts(
          Object.fromEntries(
            res.features.filter((f) => f.pricePaise !== null).map((f) => [f.key, paiseToRupeeInput(f.pricePaise as number)]),
          ),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load features"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  function setSaving(key: string, saving: boolean) {
    setSavingKeys((prev) => {
      const next = new Set(prev);
      if (saving) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function setRowError(key: string, message: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }

  async function handleToggle(row: AdminFeatureRow, nextEnabled: boolean) {
    if (!features) return;
    const previous = features;
    setSaving(row.key, true);
    setRowError(row.key, null);
    setFeatures((fs) => fs && fs.map((f) => (f.key === row.key ? { ...f, enabled: nextEnabled } : f)));
    try {
      const updated = await adminApi.updateFeature({ key: row.key, enabled: nextEnabled, pricePaise: row.pricePaise });
      setFeatures((fs) => fs && fs.map((f) => (f.key === row.key ? updated : f)));
    } catch (err) {
      setFeatures(previous);
      setRowError(row.key, err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setSaving(row.key, false);
    }
  }

  async function handlePriceCommit(row: AdminFeatureRow) {
    const draft = priceDrafts[row.key] ?? "";
    const parsed = validatePriceInput(draft);
    if (!parsed.ok) {
      setRowError(row.key, parsed.error);
      return;
    }
    if (parsed.paise === row.pricePaise) {
      setRowError(row.key, null);
      return;
    }
    if (!features) return;
    const previous = features;
    setSaving(row.key, true);
    setRowError(row.key, null);
    setFeatures((fs) => fs && fs.map((f) => (f.key === row.key ? { ...f, pricePaise: parsed.paise } : f)));
    try {
      const updated = await adminApi.updateFeature({ key: row.key, enabled: row.enabled, pricePaise: parsed.paise });
      setFeatures((fs) => fs && fs.map((f) => (f.key === row.key ? updated : f)));
      setPriceDrafts((prev) => ({ ...prev, [row.key]: paiseToRupeeInput(updated.pricePaise ?? parsed.paise) }));
    } catch (err) {
      setFeatures(previous);
      setPriceDrafts((prev) => ({ ...prev, [row.key]: paiseToRupeeInput(row.pricePaise as number) }));
      setRowError(row.key, err instanceof ApiError ? err.message : "Failed to update price");
    } finally {
      setSaving(row.key, false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-1">Features</h1>
      <p className="text-xs text-muted mb-6">
        Global kill-switches for nav tabs, home cards, paid features, and reports. Changes take effect immediately for
        every user (subject to per-group overrides — see Groups).
      </p>

      {loading && !features && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchFeatures} />}

      {features && !error && (
        <>
          {features.length === 0 && <p className="text-sm text-muted text-center py-10">No features configured.</p>}
          {groupFeaturesByGroup(features).map(({ group, items }) => (
            <FeatureGroupSection key={group} group={group}>
              {items.map((row) => (
                <FeatureRow
                  key={row.key}
                  label={row.label}
                  featureKey={row.key}
                  error={rowErrors[row.key]}
                  priceEditor={
                    row.pricePaise !== null ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted">₹</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={priceDrafts[row.key] ?? ""}
                          disabled={savingKeys.has(row.key)}
                          onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [row.key]: e.target.value }))}
                          onBlur={() => handlePriceCommit(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          className="w-20 bg-surface border border-border rounded-lg px-2 py-1 text-sm text-foreground text-right disabled:opacity-50"
                        />
                      </div>
                    ) : undefined
                  }
                  control={
                    <Switch
                      checked={row.enabled}
                      disabled={savingKeys.has(row.key)}
                      onChange={(next) => handleToggle(row, next)}
                      aria-label={`Toggle ${row.label}`}
                    />
                  }
                />
              ))}
            </FeatureGroupSection>
          ))}
        </>
      )}
    </div>
  );
}
