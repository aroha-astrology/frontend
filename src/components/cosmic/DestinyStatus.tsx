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
      <p
        className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3"
        style={{ color: 'rgba(155,127,232,0.70)' }}
      >
        Destiny Status
      </p>
      <div className="grid grid-cols-2 gap-2">
        {chips.map((chip, i) => (
          <StatusChip key={i} chip={chip} />
        ))}
      </div>
    </section>
  );
}
