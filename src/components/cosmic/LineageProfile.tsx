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
      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: 'rgba(155,127,232,0.70)' }}>
        Lineage &amp; Profile
      </p>

      {/* Birth details card */}
      <div
        className="rounded-2xl p-4 mb-3 backdrop-blur-sm"
        style={{ background: 'rgba(15,16,32,0.70)', border: '1px solid rgba(123,95,202,0.18)' }}
      >
        <p className="text-base font-bold mb-3" style={{ color: '#F0F0FF' }}>
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
        className="rounded-2xl p-4 mb-3 backdrop-blur-sm"
        style={{ background: 'rgba(15,16,32,0.70)', border: '1px solid rgba(123,95,202,0.18)' }}
      >
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: 'rgba(155,127,232,0.65)' }}>
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
        className="rounded-2xl p-4 backdrop-blur-sm"
        style={{ background: 'rgba(15,16,32,0.70)', border: '1px solid rgba(123,95,202,0.18)' }}
      >
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: 'rgba(155,127,232,0.65)' }}>
          Astrological Narrative
        </p>
        <p className="text-[11px] text-text-secondary leading-relaxed">{profile.narrative}</p>
      </div>
    </section>
  );
}
