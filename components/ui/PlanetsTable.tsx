'use client';

import Card from './Card';

interface PlanetData {
  planet: string;
  sign: string;
  signIndex: number;
  signDegree: number;
  house: number;
  nakshatra: string;
  nakshatraIndex: number;
  isRetrograde: boolean;
  speed: number;
  longitude: number;
}

interface PlanetsTableProps {
  planets: PlanetData[];
  className?: string;
}

const GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

export default function PlanetsTable({ planets, className = '' }: PlanetsTableProps) {
  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-3 flex items-center gap-2">
        <span className="text-gold text-xs">❆</span>
        Planet Positions
        <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gold/50 text-[10px] uppercase tracking-wider">
              <th className="text-left pb-2 pr-2">Planet</th>
              <th className="text-left pb-2 pr-2">Sign</th>
              <th className="text-center pb-2 pr-2">H</th>
              <th className="text-right pb-2 pr-2">Degree</th>
              <th className="text-left pb-2">Nakshatra</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p) => (
              <tr key={p.planet} className="border-t border-gold/5">
                <td className={`py-1.5 pr-2 font-semibold ${p.isRetrograde ? 'text-purple-400' : 'text-gold'}`}>
                  <span className="mr-1">{GLYPHS[p.planet] ?? ''}</span>
                  {p.planet}
                  {p.isRetrograde && <span className="ml-1 text-[9px] text-purple-400">(R)</span>}
                </td>
                <td className="py-1.5 pr-2 text-muted">{p.sign}</td>
                <td className="py-1.5 pr-2 text-center text-muted">{p.house}</td>
                <td className="py-1.5 pr-2 text-right text-muted tabular-nums">
                  {p.signDegree?.toFixed(2)}°
                </td>
                <td className="py-1.5 text-muted">{p.nakshatra}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
