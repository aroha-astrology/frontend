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
      className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 text-left')}
      style={{
        WebkitTapHighlightColor: 'transparent',
        background: isSelected ? 'rgba(123,95,202,0.12)' : 'rgba(15,16,32,0.60)',
        borderColor: isSelected ? 'rgba(123,95,202,0.45)' : 'rgba(123,95,202,0.15)',
        boxShadow: isSelected ? '0 0 18px rgba(123,95,202,0.20)' : 'none',
      }}
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
          style={{ color: isSelected ? '#9B7FE8' : 'rgba(106,106,138,0.80)', fontFamily: 'var(--font-body)' }}
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
