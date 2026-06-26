'use client';

import Card from './Card';

interface DashaPeriod {
  planet: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  level: string;
  subPeriods?: DashaPeriod[];
}

interface DashaData {
  mahadashas: DashaPeriod[];
  currentMahadasha: DashaPeriod | null;
  currentAntardasha: DashaPeriod | null;
  currentPratyantardasha: DashaPeriod | null;
}

interface DashaTimelineProps {
  dasha: DashaData;
  className?: string;
}

const PLANET_COLORS: Record<string, string> = {
  Sun: '#D4AF37', Moon: '#C0C0C0', Mars: '#E74C3C', Mercury: '#2ECC71',
  Jupiter: '#F39C12', Venus: '#FF69B4', Saturn: '#3498DB', Rahu: '#8E44AD', Ketu: '#95A5A6',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 7);
  }
}

export default function DashaTimeline({ dasha, className = '' }: DashaTimelineProps) {
  const { mahadashas, currentMahadasha, currentAntardasha } = dasha;

  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-3 flex items-center gap-2">
        <span className="text-accent text-xs">✦</span>
        Vimshottari Dasha
        <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
      </h3>

      {/* Current period highlight */}
      {currentMahadasha && (
        <div className="mb-4 p-3 rounded-xl border border-primary/20 bg-primary/5">
          <div className="text-xs text-text-secondary mb-1">Current Period</div>
          <div className="text-sm font-bold text-primary">
            {currentMahadasha.planet} Mahadasha
            {currentAntardasha && (
              <span className="font-normal text-text-secondary">
                {' → '}{currentAntardasha.planet} Antardasha
              </span>
            )}
          </div>
          <div className="text-[10px] text-text-secondary mt-1">
            {formatDate(currentMahadasha.startDate)} — {formatDate(currentMahadasha.endDate)}
          </div>
        </div>
      )}

      {/* Timeline bar */}
      <div className="flex rounded-full overflow-hidden h-6 mb-4 border border-gold/10">
        {mahadashas.map((md) => {
          const start = new Date(md.startDate).getTime();
          const end = new Date(md.endDate).getTime();
          const total = mahadashas.reduce((s, m) =>
            s + new Date(m.endDate).getTime() - new Date(m.startDate).getTime(), 0);
          const width = ((end - start) / total) * 100;
          const color = PLANET_COLORS[md.planet] ?? '#666';

          return (
            <div
              key={md.planet + md.startDate}
              className="relative flex items-center justify-center text-[7px] font-bold overflow-hidden"
              style={{
                width: `${width}%`,
                backgroundColor: md.isActive ? color : `${color}33`,
                color: md.isActive ? '#000' : `${color}cc`,
              }}
              title={`${md.planet}: ${formatDate(md.startDate)} - ${formatDate(md.endDate)}`}
            >
              {width > 6 && md.planet.slice(0, 2)}
            </div>
          );
        })}
      </div>

      {/* Sub-periods table for active MD */}
      {currentMahadasha?.subPeriods && currentMahadasha.subPeriods.length > 0 && (
        <>
          <div className="text-[10px] text-text-secondary mb-2 font-semibold uppercase tracking-wider">
            Antardashas in {currentMahadasha.planet} Mahadasha
          </div>
          <div className="space-y-1">
            {currentMahadasha.subPeriods.map((ad) => (
              <div
                key={ad.planet + ad.startDate}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs ${
                  ad.isActive
                    ? 'bg-primary/10 border border-primary/20 text-primary font-semibold'
                    : 'text-text-secondary'
                }`}
              >
                <span>{ad.planet}</span>
                <span className="text-[10px] tabular-nums">
                  {formatDate(ad.startDate)} — {formatDate(ad.endDate)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
