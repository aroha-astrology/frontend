import { Badge } from '@/components/ui/badge';
import type { DestinyChip } from '@/data/cosmic/profile';
import { PLANET_VISUAL } from '@/components/3d/planet-registry';

interface StatusChipProps {
  chip: DestinyChip;
}

export function StatusChip({ chip }: StatusChipProps) {
  const planetColor = chip.planet ? PLANET_VISUAL[chip.planet]?.color : undefined;

  return (
    <Badge
      variant={chip.tone}
      size="md"
      className="flex-col items-start gap-0 py-2 px-3 rounded-xl normal-case tracking-normal"
      style={planetColor ? { borderColor: `${planetColor}44` } : undefined}
    >
      <span className="text-[9px] font-semibold tracking-[0.12em] uppercase opacity-60 mb-0.5">
        {chip.icon && <span className="mr-1">{chip.icon}</span>}
        {chip.label}
      </span>
      <span className="text-xs font-bold leading-tight">{chip.value}</span>
    </Badge>
  );
}
