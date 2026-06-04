interface LoreSearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function LoreSearchBar({ value, onChange }: LoreSearchBarProps) {
  return (
    <div className="relative mx-4 mt-3">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none select-none">
        ✦
      </span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search lore…"
        className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm text-text placeholder-text-muted border border-border/60 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all backdrop-blur-sm"
        style={{ background: 'var(--glass-3-bg)' }}
      />
    </div>
  );
}
