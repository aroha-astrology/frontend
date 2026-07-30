"use client";

import { ADMIN_DATE_RANGE_PRESETS, isValidCustomRange, type AdminDateRangePreset } from "@/lib/admin-format";

export interface AdminRangeValue {
  preset: AdminDateRangePreset;
  /** YYYY-MM-DD — only meaningful when preset === 'custom'. */
  from: string;
  /** YYYY-MM-DD — only meaningful when preset === 'custom'. */
  to: string;
}

/**
 * A row of preset pills (all 12 backend-contract presets) plus a custom-range
 * fallback (two date inputs) shown only when 'custom' is selected. Fully
 * controlled — the parent owns `value` and decides what to prefill when the
 * user first switches into 'custom'.
 */
export default function DateRangePicker({
  value,
  onChange,
}: {
  value: AdminRangeValue;
  onChange: (next: AdminRangeValue) => void;
}) {
  const rangeInvalid = value.preset === "custom" && value.from !== "" && value.to !== "" && !isValidCustomRange(value.from, value.to);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ADMIN_DATE_RANGE_PRESETS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ ...value, preset: opt.value })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              value.preset === opt.value
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border text-muted hover:border-gold/30"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="bg-surface border border-border rounded-lg px-2 py-1.5 text-foreground"
          />
          <span className="text-muted">to</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="bg-surface border border-border rounded-lg px-2 py-1.5 text-foreground"
          />
          {rangeInvalid && <span className="text-xs text-red-400">From must be on or before to</span>}
        </div>
      )}
    </div>
  );
}
