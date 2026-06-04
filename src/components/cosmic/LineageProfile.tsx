import type { CosmicProfile } from '@/data/cosmic/types';

interface LineageProfileProps {
  profile: CosmicProfile;
}

function BirthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[10px] text-text-secondary shrink-0">{label}</span>
      <span className="text-[10px] font-medium text-text text-right">{value}</span>
    </div>
  );
}

export function LineageProfile({ profile }: LineageProfileProps) {
  const { birth } = profile;

  const dobDisplay = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(birth.dob));

  return (
    <section className="px-4 mt-5">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-primary/70 uppercase mb-3">
        Lineage &amp; Profile
      </p>

      {/* Birth details card */}
      <div
        className="rounded-2xl border border-border/50 p-4 mb-3 backdrop-blur-sm"
        style={{ background: 'var(--glass-3-bg)' }}
      >
        <p className="font-[family-name:var(--font-serif)] text-base font-bold text-text mb-3 j-text-gold">
          {birth.name}
        </p>
        <div className="space-y-1.5">
          <BirthRow label="Date of Birth" value={dobDisplay} />
          <BirthRow label="Time of Birth" value={birth.tob} />
          <BirthRow label="Place of Birth" value={birth.pob} />
          <BirthRow label="Timezone" value={birth.timezone} />
          <BirthRow label="Coordinates" value={`${birth.lat.toFixed(4)}°N, ${birth.lng.toFixed(4)}°E`} />
        </div>
      </div>

      {/* Dasha span */}
      <div
        className="rounded-2xl border border-border/50 p-4 mb-3 backdrop-blur-sm"
        style={{ background: 'var(--glass-3-bg)' }}
      >
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-primary/60 mb-2">
          Current Planetary Period
        </p>
        <div className="space-y-1.5">
          <BirthRow
            label="Mahadasha"
            value={`${profile.currentMahadasha.planet} (${profile.currentMahadasha.startDate.slice(0, 4)}–${profile.currentMahadasha.endDate.slice(0, 4)})`}
          />
          <BirthRow
            label="Antardasha"
            value={`${profile.currentAntardasha.planet} (${profile.currentAntardasha.startDate.slice(0, 7)} → ${profile.currentAntardasha.endDate.slice(0, 7)})`}
          />
        </div>
      </div>

      {/* Narrative */}
      <div
        className="rounded-2xl border border-border/50 p-4 backdrop-blur-sm"
        style={{ background: 'var(--glass-3-bg)' }}
      >
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-primary/60 mb-2">
          Astrological Narrative
        </p>
        <p className="text-[11px] text-text-secondary leading-relaxed">{profile.narrative}</p>
      </div>
    </section>
  );
}
