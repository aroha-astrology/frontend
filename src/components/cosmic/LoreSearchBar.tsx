import { Search } from 'lucide-react';

interface LoreSearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function LoreSearchBar({ value, onChange }: LoreSearchBarProps) {
  return (
    <div className="relative mx-6 mb-5">
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Forbidden Lore…"
        className="w-full rounded-xl py-3 pl-4 pr-10 text-sm outline-none transition-all"
        style={{
          background: 'rgba(26,28,28,0.80)',
          border: '1px solid #37393a',
          color: '#f4f4f4',
          caretColor: '#e5c100',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#e5c100'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(229,193,0,0.30)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#37393a'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      <button
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: 'rgba(168,168,168,0.80)' }}
        type="button"
        aria-label="Search"
      >
        <Search size={16} />
      </button>
    </div>
  );
}
