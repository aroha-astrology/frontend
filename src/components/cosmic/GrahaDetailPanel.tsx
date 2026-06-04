import { PLANET_VISUAL, type PlanetKey } from '@/components/3d/planet-registry';
import { GRAHA_DATA } from '@/data/cosmic/grahas';

interface GrahaDetailPanelProps {
  planet: PlanetKey;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[10px] text-text-secondary shrink-0">{label}</span>
      <span className="text-[10px] font-medium text-text text-right">{value}</span>
    </div>
  );
}

export function GrahaDetailPanel({ planet }: GrahaDetailPanelProps) {
  const v = PLANET_VISUAL[planet];
  const g = GRAHA_DATA[planet];

  return (
    <div
      className="mx-4 mt-3 rounded-2xl p-4 backdrop-blur-sm"
      style={{ background: 'rgba(15,16,32,0.75)', border: '1px solid rgba(123,95,202,0.20)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full shrink-0"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${v.color} 0%, ${v.color}88 60%, transparent 100%)`,
            boxShadow: `0 0 20px ${v.glow}`,
          }}
        />
        <div>
          <p className="text-sm font-bold text-text">{g.nameEn} ({g.nameSa})</p>
          <p
            className="text-xs"
            style={{ color: v.color, fontFamily: 'var(--font-body)' }}
          >
            {g.nameHi} · #{g.number}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-text-secondary mb-3 leading-relaxed">{g.signification}</p>

      <div className="grid grid-cols-2 gap-1.5">
        <DetailRow label="Element" value={g.element} />
        <DetailRow label="Weekday" value={g.weekday} />
        <DetailRow label="Gemstone" value={g.gemstone} />
        <DetailRow label="Metal" value={g.metal} />
        <DetailRow label="Exaltation" value={g.exaltationSign} />
        <DetailRow label="Debilitation" value={g.debilitationSign} />
        <DetailRow label="Own Signs" value={g.ownSigns.join(', ') || '—'} />
        <DetailRow label="Deity" value={g.deity} />
      </div>
    </div>
  );
}
