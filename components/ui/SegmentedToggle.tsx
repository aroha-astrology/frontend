"use client";

interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  value: T;
  options: SegmentedToggleOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** Small pill-group selector — same visual language as the horoscope page's period toggle. */
export default function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: SegmentedToggleProps<T>) {
  return (
    <div className={`inline-flex gap-1.5 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
            value === opt.value
              ? "border-gold/50 bg-gold/10 text-gold"
              : "border-gold/10 text-muted hover:border-gold/30"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
