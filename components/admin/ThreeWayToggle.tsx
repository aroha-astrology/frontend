"use client";

import type { AdminGroupFeatureState } from "@/lib/admin-api";

const OPTIONS: { value: AdminGroupFeatureState; label: string }[] = [
  { value: "inherit", label: "Inherit" },
  { value: true, label: "On" },
  { value: false, label: "Off" },
];

/**
 * 3-way Inherit/On/Off control for a group's per-feature override state.
 * 'inherit' (no override — falls through to the global switch) is rendered
 * neutral/muted even when active, while an explicit On/Off override gets a
 * clear status color — so an admin can tell at a glance which features this
 * group has actually touched vs. left alone, without reading the label.
 */
export default function ThreeWayToggle({
  value,
  onChange,
  disabled,
}: {
  value: AdminGroupFeatureState;
  onChange: (next: AdminGroupFeatureState) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-full border border-border overflow-hidden text-xs font-medium">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        const activeClass =
          opt.value === "inherit"
            ? "bg-surface-2 text-foreground"
            : opt.value === true
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400";
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 transition-colors disabled:opacity-50 ${
              active ? activeClass : "text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
