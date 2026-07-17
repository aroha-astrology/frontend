'use client';

import { useState } from 'react';
import Card from './Card';

interface DashaPeriod {
  planet: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  level: string;
  subPeriods?: DashaPeriod[];
  deity?: string;
}

interface DashaTimelineProps {
  dasha: any;
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
  const [activeSystem, setActiveSystem] = useState<'vimshottari' | 'yogini'>('vimshottari');

  const vim = dasha?.vimshottari || dasha;
  const ygn = dasha?.yogini;

  const isVim = activeSystem === 'vimshottari';
  
  const periods = isVim ? (vim?.mahadashas || []) : (ygn?.yoginis || []);
  const currentPeriod = isVim ? vim?.currentMahadasha : ygn?.currentYogini;
  const currentSub = isVim ? vim?.currentAntardasha : ygn?.currentYogini?.subPeriods?.find((sp: DashaPeriod) => sp.isActive);
  const currentSubSub = isVim ? vim?.currentPratyantardasha : null;

  return (
    <Card className={`p-4 ${className}`}>
      {/* Tabs / Header */}
      {ygn ? (
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setActiveSystem('vimshottari')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              isVim ? 'bg-gold text-black' : 'bg-gold/10 text-gold/60 hover:text-gold'
            }`}
          >
            Vimshottari
          </button>
          <button
            onClick={() => setActiveSystem('yogini')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              !isVim ? 'bg-gold text-black' : 'bg-gold/10 text-gold/60 hover:text-gold'
            }`}
          >
            Yogini
          </button>
        </div>
      ) : (
        <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-3 flex items-center gap-2">
          <span className="text-gold text-xs">❆</span>
          Vimshottari Dasha
          <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
        </h3>
      )}

      {/* Current period highlight */}
      {currentPeriod && (
        <div className="mb-4 p-3 rounded-xl border border-gold/20 bg-gold/5">
          <div className="text-xs text-muted mb-1">Current Period</div>
          <div className="text-sm font-bold text-gold">
            {currentPeriod.deity ? `${currentPeriod.deity} (${currentPeriod.planet})` : `${currentPeriod.planet} Mahadasha`}
            {currentSub && (
              <span className="font-normal text-muted">
                {' → '}{currentSub.deity ? `${currentSub.deity} (${currentSub.planet})` : `${currentSub.planet} Antardasha`}
              </span>
            )}
            {currentSubSub && (
              <span className="font-normal text-muted">
                {' → '}{currentSubSub.planet} Pratyantardasha
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted mt-1">
            {formatDate(currentPeriod.startDate)} — {formatDate(currentPeriod.endDate)}
          </div>
        </div>
      )}

      {/* Timeline bar */}
      {periods.length > 0 && (
        <div className="flex rounded-full overflow-hidden h-6 mb-4 border border-gold/10">
          {periods.map((md: DashaPeriod) => {
            const start = new Date(md.startDate).getTime();
            const end = new Date(md.endDate).getTime();
            const total = periods.reduce((s: number, m: DashaPeriod) =>
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
                title={`${md.deity || md.planet}: ${formatDate(md.startDate)} - ${formatDate(md.endDate)}`}
              >
                {width > 6 && (md.deity ? md.deity.slice(0, 3) : md.planet.slice(0, 2))}
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-periods table for active MD */}
      {currentPeriod?.subPeriods && currentPeriod.subPeriods.length > 0 && (
        <>
          <div className="text-[10px] text-muted mb-2 font-semibold uppercase tracking-wider">
            Sub-periods in {currentPeriod.deity || currentPeriod.planet}
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {currentPeriod.subPeriods.map((ad: DashaPeriod) => (
              <div
                key={ad.planet + ad.startDate}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs ${
                  ad.isActive
                    ? 'bg-gold/10 border border-gold/20 text-gold font-semibold'
                    : 'text-muted'
                }`}
              >
                <span>{ad.deity ? `${ad.deity} (${ad.planet})` : ad.planet}</span>
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
