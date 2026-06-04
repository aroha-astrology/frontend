import type { CosmicProfile } from '@/data/cosmic/types';

interface LineageProfileProps {
  profile: CosmicProfile;
}

export function LineageProfile({ profile }: LineageProfileProps) {
  const { birth } = profile;

  const dobDisplay = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(birth.dob));

  return (
    <section className="w-full cd-glass-card cd-shimmer px-6 py-6 mx-4 mb-6" style={{ width: 'calc(100% - 2rem)' }}>
      <h2
        className="text-lg font-medium mb-4"
        style={{ color: '#e5c100' }}
      >
        Lineage and Exploits
      </h2>
      <div className="text-sm leading-relaxed space-y-3 text-justify" style={{ color: '#c4c7c5', fontWeight: 300 }}>
        <p>{profile.narrative}</p>
        <div className="pt-3 border-t space-y-2" style={{ borderColor: 'rgba(229,193,0,0.10)' }}>
          {[
            ['Name', birth.name],
            ['Date of Birth', dobDisplay],
            ['Time of Birth', birth.tob],
            ['Place of Birth', birth.pob],
            ['Mahadasha', `${profile.currentMahadasha.planet} (${profile.currentMahadasha.startDate.slice(0,4)}–${profile.currentMahadasha.endDate.slice(0,4)})`],
            ['Antardasha', `${profile.currentAntardasha.planet} → ${profile.currentAntardasha.endDate.slice(0,7)}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-wide shrink-0" style={{ color: 'rgba(196,199,197,0.55)' }}>{label}</span>
              <span className="text-xs font-medium text-right" style={{ color: '#e2e2e2' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
