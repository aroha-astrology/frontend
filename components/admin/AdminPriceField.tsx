"use client";

/**
 * One labeled ₹ price input inside a Features board row — shared by the
 * "Sale Price" (mandatory, what's actually charged) and "Original Price"
 * (optional MRP for the strikethrough/discount badge) editors so the two
 * don't duplicate the same label/currency-symbol/input/blur-to-save markup.
 */
export default function AdminPriceField({
  id,
  label,
  title,
  value,
  onChange,
  onCommit,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  /** Optional hover tooltip on the label — used to explain "Original Price" to a non-technical admin without cluttering the row. */
  title?: string;
  value: string;
  onChange: (value: string) => void;
  /** Fires on blur or Enter — same "commit on blur" pattern as the rest of this board. */
  onCommit: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <label htmlFor={id} title={title} className="text-[9px] uppercase tracking-wide text-muted whitespace-nowrap">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted">₹</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="w-20 bg-surface border border-border rounded-lg px-2 py-1 text-sm text-foreground text-right disabled:opacity-50"
        />
      </div>
    </div>
  );
}
