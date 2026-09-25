"use client";

import { formatModelPricing, modelPricingDetail } from "@/lib/admin-format";

/**
 * The model dropdown a Features/Group row shows in place of a price editor
 * when the key declares `modelOptions` (see FeatureRow's priceEditor slot).
 * Each option is captioned with its $/1M-token list price (see
 * formatModelPricing), and the picked model's full price, notes included,
 * sits under the dropdown so an admin can compare cost before picking — that
 * pricing table is a static reference only, not the live cost dashboard (see
 * its own doc comment in admin-format.ts).
 */
export default function ModelSelect({
  id,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  /** null renders the browser's own blank/first-option state — callers on the Groups page pass
   * null while a row isn't actually pinned to a model yet. */
  value: string | null;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const detail = value ? modelPricingDetail(value) : null;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <label htmlFor={id} className="text-[9px] uppercase tracking-wide text-muted whitespace-nowrap">
        Model
      </label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-foreground disabled:opacity-50 max-w-[280px]"
      >
        {value === null && (
          <option value="" disabled>
            Select a model…
          </option>
        )}
        {options.map((opt) => {
          const price = formatModelPricing(opt);
          return (
            <option key={opt} value={opt}>
              {opt}
              {price ? ` — ${price}` : ""}
            </option>
          );
        })}
      </select>
      {detail && <p className="max-w-[280px] text-right text-[10px] leading-snug text-muted">{detail}</p>}
    </div>
  );
}
