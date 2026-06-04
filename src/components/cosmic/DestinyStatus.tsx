import { buildDestinyChips } from '@/data/cosmic/profile';
import type { CosmicProfile } from '@/data/cosmic/types';
import { StatusChip } from './StatusChip';

interface DestinyStatusProps {
  profile: CosmicProfile;
}

export function DestinyStatus({ profile }: DestinyStatusProps) {
  const chips = buildDestinyChips(profile);

  return (
    <section className="w-full cd-glass-card cd-shimmer px-5 py-5 mb-5 mx-4" style={{ width: 'calc(100% - 2rem)' }}>
      <h2 className="text-base font-medium mb-4" style={{ color: '#e2e2e2' }}>
        Destiny Status
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {chips.map((chip, i) => (
          <StatusChip key={i} chip={chip} />
        ))}
      </div>
    </section>
  );
}
