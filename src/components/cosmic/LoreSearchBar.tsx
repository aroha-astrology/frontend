interface LoreSearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function LoreSearchBar({ value, onChange }: LoreSearchBarProps) {
  return (
    <div className="relative mx-4 mt-3">
      <span
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none font-bold"
        style={{ color: 'rgba(155,127,232,0.60)' }}
      >
        |
      </span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search forbidden lore…"
        className="w-full pl-8 pr-4 py-3 rounded-2xl text-sm outline-none transition-all font-mono"
        style={{
          background: 'rgba(15,16,32,0.75)',
          border: '1px solid rgba(123,95,202,0.25)',
          color: '#F0F0FF',
          caretColor: '#9B7FE8',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(123,95,202,0.55)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(123,95,202,0.25)'; }}
      />
    </div>
  );
}
