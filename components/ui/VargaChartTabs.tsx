'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NorthIndianChart from './NorthIndianChart';
import Card from './Card';
import { buildVargaRenderData, VARGA_KEYS, type VargaData } from '@/lib/divisional-charts';

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

export default function VargaChartTabs({ divisionalCharts, className = '' }: VargaChartTabsProps) {
  const { t } = useTranslation();
  const available = VARGA_KEYS.filter((v) => divisionalCharts[v]);
  const [active, setActive] = useState<string>(available[0] ?? 'D1');

  const varga = divisionalCharts[active];
  if (!varga) return null;

  const chartData = buildVargaRenderData(varga);
  const label = t(`divisionalCharts.labels.${active}`, VARGA_LABELS[active] ?? active);

  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-3 flex items-center gap-2">
        <span className="text-accent text-xs">✦</span>
        {t('divisionalCharts.title', 'Divisional Charts')}
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
