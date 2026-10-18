"use client";

import type { FeatureAudience } from "@/lib/admin-api";
import { AUDIENCE_LABELS } from "@/lib/admin-format";

const ORDER: FeatureAudience[] = ["all", "classic", "cosmic"];

/**
 * Which section a feature is for: Everyone, the Indian look (Classic Vedic) or the international
 * look (Modern Cosmic). Narrower than Everyone means a user in the other section does not see it
 * even with its switch on; a feature switched on for an admin group ignores this.
 */
export default function AudienceSelect({
  featureKey,
  value,
  defaultValue,
  disabled,
  onChange,
}: {
  featureKey: string;
  value: FeatureAudience;
  /** The starting audience the feature shipped with; a different value is marked "changed". */
  defaultValue: FeatureAudience;
  disabled?: boolean;
  onChange: (next: FeatureAudience) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2" data-testid={`audience-${featureKey}`}>
      <div className="inline-flex rounded-full border border-border overflow-hidden text-[10px] font-medium" role="group" aria-label={`Who sees ${featureKey}`}>
        {ORDER.map((opt) => {
          const active = opt === value;
          const activeClass =
            opt === "all"
              ? "bg-surface-2 text-foreground"
              : opt === "classic"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-indigo-500/20 text-indigo-300";
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => !active && onChange(opt)}
              className={`px-2.5 py-1 transition-colors disabled:opacity-50 ${active ? activeClass : "text-muted hover:text-foreground"}`}
            >
              {AUDIENCE_LABELS[opt]}
            </button>
          );
        })}
      </div>
      {value !== defaultValue && (
        <span className="text-[10px] text-muted">changed (started as {AUDIENCE_LABELS[defaultValue]})</span>
      )}
    </div>
  );
}
