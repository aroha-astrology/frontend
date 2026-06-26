'use client';

import { useState } from 'react';
import NorthIndianChart from './NorthIndianChart';
import Card from './Card';

interface VargaData {
  planets: { planet: string; sign: string; signIndex: number }[];
  ascendantSignIndex: number;
}

interface VargaChartTabsProps {
  divisionalCharts: Record<string, VargaData>;
  className?: string;
}

const VARGA_LABELS: Record<string, string> = {
  D1: 'Rashi', D2: 'Hora', D3: 'Drekkana', D4: 'Chaturthamsa',
  D5: 'Panchamsa', D7: 'Saptamsa', D9: 'Navamsa', D10: 'Dashamsa',
  D12: 'Dwadashamsa', D16: 'Shodashamsa', D20: 'Vimshamsa',
  D24: 'Chaturvimshamsa', D27: 'Bhamsha', D30: 'Trimshamsha',
  D40: 'Khavedamsa', D45: 'Akshavedamsa', D60: 'Shashtiamsha',
};

const IMPORTANT_VARGAS = ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const SIGN_LORDS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

function buildChartData(varga: VargaData) {
  const ascIdx = varga.ascendantSignIndex;
  const houses = Array.from({ length: 12 }, (_, i) => {
    const signIdx = (ascIdx + i) % 12;
    const sign = SIGNS[signIdx]!;
    return {
      house: i + 1,
      cusp: signIdx * 30,
      sign,
      signIndex: signIdx,
      lord: SIGN_LORDS[sign] as 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu',
      planets: varga.planets
        .filter((p) => p.signIndex === signIdx)
        .map((p) => p.planet) as ('Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu')[],
    };
  });

  const planets = varga.planets.map((p) => ({
    planet: p.planet as 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu',
    sign: p.sign,
    signIndex: p.signIndex,
    isRetrograde: false,
    house: ((p.signIndex - ascIdx + 12) % 12) + 1,
  }));

  return { houses, planets };
}

export default function VargaChartTabs({ divisionalCharts, className = '' }: VargaChartTabsProps) {
  const available = IMPORTANT_VARGAS.filter((v) => divisionalCharts[v]);
  const [active, setActive] = useState(available[0] ?? 'D1');

  const varga = divisionalCharts[active];
  if (!varga) return null;

  const chartData = buildChartData(varga);
  const label = VARGA_LABELS[active] ?? active;

  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-3 flex items-center gap-2">
        <span className="text-accent text-xs">✦</span>
        Divisional Charts
        <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
      </h3>

      {/* Tab bar — horizontal scroll */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {available.map((v) => (
          <button
            key={v}
            onClick={() => setActive(v)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-colors ${
              v === active
                ? 'bg-primary text-black'
                : 'bg-primary/10 text-primary/60 hover:bg-primary/20'
            } ${v === 'D9' && v !== active ? 'ring-1 ring-primary/30' : ''}`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="text-center text-[10px] text-text-secondary mb-2 uppercase tracking-wider">
        {active} — {label}
      </div>

      <div className="max-w-[320px] mx-auto">
        <NorthIndianChart
          chartData={chartData}
          title={`${active} ${label}`}
          instant
        />
      </div>
    </Card>
  );
}
