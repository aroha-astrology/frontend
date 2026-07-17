'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NorthIndianChart from './NorthIndianChart';
import SouthIndianChart from './SouthIndianChart';
import Card from './Card';
import { buildVargaRenderData, type VargaData } from '@/lib/divisional-charts';

type ChartStyle = 'north' | 'south';
type VargaId = 'D1' | 'D9' | 'D10';

interface ChartCarouselProps {
  /** Natal D1 houses (with lord/cusp) — rendered directly for the Rashi chart. */
  natalHouses: any[];
  natalPlanets: any[];
  /** All computed vargas, keyed "D1".."D60"; we surface D9 & D10 here. */
  divisionalCharts: Record<string, VargaData>;
  /** House-detail unlock — only wired for the D1 chart (vargas have no insights). */
  onHouseClick?: (houseNum: number) => void;
}

/** Latin title baked into the chart SVG (stylized serif — kept transliterated). */
const VARGA_TITLE: Record<VargaId, string> = {
  D1: 'Rashi (D1)',
  D9: 'Navamsa (D9)',
  D10: 'Dasamsa (D10)',
};

export default function ChartCarousel({
  natalHouses,
  natalPlanets,
  divisionalCharts,
  onHouseClick,
}: ChartCarouselProps) {
  const { t } = useTranslation();
  const [style, setStyle] = useState<ChartStyle>('north');
  const [active, setActive] = useState<VargaId>('D1');

  // D1 always available (natal); D9/D10 only when their computed data exists.
  const available: VargaId[] = (['D1', 'D9', 'D10'] as VargaId[]).filter(
    (v) => v === 'D1' || (divisionalCharts[v]?.planets?.length ?? 0) > 0,
  );

  // Guard against a stale selection if D9/D10 aren't available.
  const current: VargaId = available.includes(active) ? active : 'D1';

  const isD1 = current === 'D1';
  const chartData = isD1
    ? { houses: natalHouses, planets: natalPlanets }
    : buildVargaRenderData(divisionalCharts[current]!);

  return (
    <Card className="p-4">
      {/* Divisional selector — the manual carousel switch */}
      <div className="flex justify-center gap-1.5 mb-3">
        {available.map((v) => (
          <button
            key={v}
            onClick={() => setActive(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              current === v ? 'bg-gold text-black' : 'bg-gold/10 text-gold/60'
            }`}
          >
            {t(`kundli.charts.${v.toLowerCase()}.name`)}
          </button>
        ))}
      </div>

      {/* North / South style toggle */}
      <div className="flex justify-center gap-2 mb-4">
        {(['north', 'south'] as ChartStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              style === s ? 'bg-gold/20 text-gold' : 'bg-surface/60 text-muted'
            }`}
          >
            {t(`kundli.charts.style.${s}`)}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="max-w-[380px] mx-auto">
        {style === 'north' ? (
          <NorthIndianChart
            chartData={chartData}
            title={VARGA_TITLE[current]}
            instant={!isD1}
            onHouseClick={isD1 ? onHouseClick : undefined}
          />
        ) : (
          <SouthIndianChart
            chartData={chartData}
            title={VARGA_TITLE[current]}
            onHouseClick={isD1 ? onHouseClick : undefined}
          />
        )}
      </div>

      {/* What this chart is / means */}
      <p className="mt-4 text-xs leading-relaxed text-muted text-center max-w-[420px] mx-auto">
        {t(`kundli.charts.${current.toLowerCase()}.desc`)}
      </p>
    </Card>
  );
}
