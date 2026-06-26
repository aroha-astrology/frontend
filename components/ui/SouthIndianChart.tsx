'use client';

type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

interface PlanetPosition {
  planet: Planet;
  sign: string;
  signIndex: number;
  isRetrograde: boolean;
  [key: string]: unknown;
}

interface HouseData {
  house: number;
  sign: string;
  signIndex: number;
  lord: Planet;
  planets: Planet[];
  [key: string]: unknown;
}

interface SouthIndianChartProps {
  chartData: { houses: HouseData[]; planets: PlanetPosition[] };
  ascendantHouse?: number;
  title?: string;
}

const PLANET_GLYPHS: Record<Planet, string> = {
  Sun: '☉', Moon: '☾', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

const PLANET_ABBR: Record<Planet, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

function getPlanetLabel(planet: Planet, isRetrograde: boolean): string {
  const glyph = PLANET_GLYPHS[planet] ?? '';
  const abbr = PLANET_ABBR[planet] || planet.slice(0, 2);
  const base = glyph ? `${glyph} ${abbr}` : abbr;
  return isRetrograde ? `${base}(R)` : base;
}

const SIGN_GRID_MAP: Record<number, [number, number]> = {
  11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3],
  3: [1, 3], 4: [2, 3], 5: [3, 3], 6: [3, 2],
  7: [3, 1], 8: [3, 0], 9: [2, 0], 10: [1, 0],
};

const SIGN_ABBR: Record<number, string> = {
  0: 'Ari', 1: 'Tau', 2: 'Gem', 3: 'Can', 4: 'Leo', 5: 'Vir',
  6: 'Lib', 7: 'Sco', 8: 'Sag', 9: 'Cap', 10: 'Aqu', 11: 'Pis',
};

const CELL = 90;
const PAD = 10;

const SI_STARS = [
  [8, 8], [48, 5], [100, 18], [200, 6], [310, 14], [368, 8],
  [380, 90], [375, 200], [370, 310], [355, 368], [270, 382],
  [170, 388], [70, 375], [15, 330], [8, 220], [12, 110],
] as const;

export default function SouthIndianChart({
  chartData,
  ascendantHouse = 1,
  title = 'Rashi Chart',
}: SouthIndianChartProps) {
  const { houses, planets } = chartData;

  const signPlanets: Record<number, string[]> = {};
  for (let i = 0; i < 12; i++) signPlanets[i] = [];
  planets.forEach((p) => {
    const label = getPlanetLabel(p.planet, p.isRetrograde);
    if (signPlanets[p.signIndex] !== undefined) signPlanets[p.signIndex].push(label);
  });

  const ascHouse = houses.find((h) => h.house === ascendantHouse);
  const ascSignIndex = ascHouse?.signIndex ?? 0;
  const totalSize = CELL * 4 + PAD * 2;

  return (
    <svg viewBox={`0 0 ${totalSize} ${totalSize}`} className="w-full max-w-[400px]" role="img" aria-label={title}>
      <defs>
        <radialGradient id="siCenterGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="rgba(212,175,55,0.06)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="siAscGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(212,175,55,0.16)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0.06)" />
        </linearGradient>
        <filter id="siCellGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width={totalSize} height={totalSize} fill="url(#siCenterGrad)" />

      {SI_STARS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? '0.9' : '0.55'}
          fill={i % 4 === 0 ? 'rgba(212,175,55,0.28)' : 'rgba(60,72,88,0.10)'} />
      ))}

      {Object.entries(SIGN_GRID_MAP).map(([signIdxStr, [row, col]]) => {
        const signIdx = parseInt(signIdxStr, 10);
        const x = PAD + col * CELL;
        const y = PAD + row * CELL;
        const isAscendant = signIdx === ascSignIndex;
        const planetLabels = signPlanets[signIdx] || [];

        return (
          <g key={signIdx} filter={isAscendant ? 'url(#siCellGlow)' : undefined}>
            <rect x={x} y={y} width={CELL} height={CELL}
              fill={isAscendant ? 'url(#siAscGrad)' : 'transparent'}
              stroke={isAscendant ? 'rgba(212,175,55,0.55)' : 'rgba(212,175,55,0.18)'}
              strokeWidth={isAscendant ? '1.5' : '0.8'} />
            {isAscendant && (
              <>
                <line x1={x} y1={y} x2={x + 18} y2={y + 18} stroke="rgba(212,175,55,0.80)" strokeWidth="2" />
                <circle cx={x} cy={y} r="3" fill="rgba(212,175,55,0.65)" />
              </>
            )}
            <text x={x + 4} y={y + 13}
              fill={isAscendant ? 'rgba(212,175,55,0.95)' : 'rgba(212,175,55,0.38)'}
              fontSize="8" fontWeight={isAscendant ? '700' : '400'}
              fontFamily="Cinzel, Georgia, serif" letterSpacing="0.5">
              {SIGN_ABBR[signIdx].toUpperCase()}
            </text>
            {planetLabels.map((label, idx) => {
              const colOffset = idx % 2;
              const rowOffset = Math.floor(idx / 2);
              return (
                <text key={label} x={x + 8 + colOffset * 42} y={y + 28 + rowOffset * 14}
                  fill={label.includes('(R)') ? 'rgba(174,128,255,0.85)' : 'rgba(212,175,55,0.95)'}
                  fontSize="11" fontWeight="700" fontFamily="DM Sans, sans-serif">
                  {label}
                </text>
              );
            })}
          </g>
        );
      })}

      <rect x={PAD + CELL} y={PAD + CELL} width={CELL * 2} height={CELL * 2}
        fill="rgba(212,175,55,0.03)" stroke="rgba(212,175,55,0.18)" strokeWidth="1" />
      <circle cx={PAD + CELL * 2} cy={PAD + CELL * 2} r={CELL * 0.55}
        fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="0.8" strokeDasharray="3 4" />
      <text x={PAD + CELL * 2} y={PAD + CELL * 2 - 6} textAnchor="middle"
        fill="rgba(212,175,55,0.65)" fontSize="11" fontWeight="600"
        fontFamily="Cinzel, Georgia, serif" letterSpacing="1">
        {title.toUpperCase()}
      </text>
      <text x={PAD + CELL * 2} y={PAD + CELL * 2 + 10} textAnchor="middle"
        fill="rgba(60,72,88,0.25)" fontSize="7" letterSpacing="1.5"
        fontFamily="Cinzel, Georgia, serif">
        SOUTH INDIAN
      </text>
    </svg>
  );
}
