import { PLANET_VISUAL, type PlanetKey } from '@/components/3d/planet-registry';
import { GRAHA_DATA } from '@/data/cosmic/grahas';
import { cn } from '@/lib/utils';

interface GrahaListRowProps {
  planetKey: PlanetKey;
  isSelected: boolean;
  onClick: () => void;
}

export function GrahaListRow({ planetKey, isSelected, onClick }: GrahaListRowProps) {
  const v = PLANET_VISUAL[planetKey];
  const g = GRAHA_DATA[planetKey];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 text-left',
        isSelected
          ? 'border-accent/40 bg-accent/8 shadow-[0_0_16px_rgba(212,175,55,0.18)]'
          : 'border-border/40 bg-surface/40 hover:border-border hover:bg-surface/70',
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Planet orb thumbnail (CSS — no WebGL per row) */}
      <div
        className="shrink-0 rounded-full j-glow-pulse"
        style={{
          width: 40,
          height: 40,
          background: `radial-gradient(circle at 35% 30%, ${v.color} 0%, ${v.color}99 50%, ${v.color}33 100%)`,
          boxShadow: isSelected ? `0 0 16px ${v.glow}` : `0 0 8px ${v.glow}55`,
        }}
      />

      {/* Names */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text leading-tight truncate">
          {g.nameEn}
          <span className="ml-1.5 text-[10px] font-normal text-text-secondary">{g.nameSa}</span>
        </p>
        <p
          className="text-xs font-medium mt-0.5"
          style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          {g.nameHi}
        </p>
        <p className="text-[10px] text-text-secondary mt-0.5 truncate">{g.descriptor}</p>
      </div>

      {/* Element badge */}
      <div
        className="shrink-0 text-[9px] font-semibold tracking-wide px-2 py-0.5 rounded-full border"
        style={{
          color: v.color,
          borderColor: `${v.color}55`,
          background: `${v.color}14`,
        }}
      >
        {g.element}
      </div>
    </button>
  );
}
