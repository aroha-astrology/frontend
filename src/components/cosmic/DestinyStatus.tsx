import { StaggerList, StaggerItem } from '@/components/ui/motion-primitives';
import { buildDestinyChips, type DestinyChip } from '@/data/cosmic/profile';
import type { CosmicProfile } from '@/data/cosmic/types';
import { StatusChip } from './StatusChip';

interface DestinyStatusProps {
  profile: CosmicProfile;
}

export function DestinyStatus({ profile }: DestinyStatusProps) {
  const chips: DestinyChip[] = buildDestinyChips(profile);

  return (
    <section className="px-4 mt-4">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-primary/70 uppercase mb-3">
        Destiny Status
      </p>
      <StaggerList className="flex flex-wrap gap-2">
        {chips.map((chip, i) => (
          <StaggerItem key={i}>
            <StatusChip chip={chip} />
          </StaggerItem>
        ))}
      </StaggerList>
    </section>
  );
}
