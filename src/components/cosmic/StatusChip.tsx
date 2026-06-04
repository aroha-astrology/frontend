import type { DestinyChip } from '@/data/cosmic/profile';
import { PLANET_VISUAL } from '@/components/3d/planet-registry';

interface StatusChipProps {
  chip: DestinyChip;
}

const TONE_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(80,200,120,0.10)',  border: 'rgba(80,200,120,0.30)',  text: '#6FD4A0' },
  warning: { bg: 'rgba(220,160,60,0.10)',  border: 'rgba(220,160,60,0.30)',  text: '#E8B86D' },
  error:   { bg: 'rgba(220,80,80,0.12)',   border: 'rgba(220,80,80,0.30)',   text: '#F08080' },
  default: { bg: 'rgba(123,95,202,0.10)',  border: 'rgba(123,95,202,0.28)', text: '#B8A0E8' },
};

export function StatusChip({ chip }: StatusChipProps) {
  const planetColor = chip.planet ? PLANET_VISUAL[chip.planet]?.color : undefined;
  const tone = TONE_STYLE[chip.tone] ?? TONE_STYLE.default;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{
        background: tone.bg,
        border: `1px solid ${planetColor ? `${planetColor}44` : tone.border}`,
      }}
    >
      {chip.icon && (
        <span className="shrink-0 text-sm leading-none" style={{ color: planetColor ?? tone.text }}>
          {chip.icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[9px] font-semibold tracking-[0.10em] uppercase leading-none mb-0.5" style={{ color: tone.text, opacity: 0.70 }}>
          {chip.label}
        </p>
        <p className="text-[11px] font-bold leading-tight truncate" style={{ color: '#F0F0FF' }}>
          {chip.value}
        </p>
      </div>
    </div>
  );
}
