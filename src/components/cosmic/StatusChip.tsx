import { Sparkles, Moon, Star, CircleDot, Orbit, Flame, Eye } from 'lucide-react';
import type { DestinyChip } from '@/data/cosmic/profile';
import { PLANET_VISUAL } from '@/components/3d/planet-registry';

interface StatusChipProps {
  chip: DestinyChip;
}

const ICON_MAP: Record<string, React.ElementType> = {
  '⬡': Sparkles,
  '☽': Moon,
  '✦': Star,
  '◎': CircleDot,
  '◉': CircleDot,
  '♄': Orbit,
  '♂': Flame,
  '☊': Orbit,
  '★': Star,
};

export function StatusChip({ chip }: StatusChipProps) {
  const Icon = ICON_MAP[chip.icon ?? ''] ?? Eye;
  const planetColor = chip.planet ? PLANET_VISUAL[chip.planet]?.color : undefined;

  return (
    <button
      type="button"
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-full transition-colors text-left"
      style={{
        background: 'rgba(55,57,58,0.50)',
        border: '1px solid rgba(229,193,0,0.10)',
      }}
    >
      <span style={{ color: planetColor ?? '#e5c100', opacity: 0.85 }}>
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium tracking-wide truncate" style={{ color: '#c4c7c5' }}>
          {chip.value}
        </p>
        <p className="text-[9px] uppercase tracking-widest truncate" style={{ color: 'rgba(196,199,197,0.50)' }}>
          {chip.label}
        </p>
      </div>
    </button>
  );
}
