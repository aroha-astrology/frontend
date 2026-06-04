'use client';

import dynamic from 'next/dynamic';
import { useLowEndDevice } from '@/components/3d/useLowEndDevice';
import { PLANET_VISUAL, type PlanetKey } from '@/components/3d/planet-registry';

const Scene = dynamic(
  () => import('./GrahaHeroScene').then(m => m.GrahaHeroScene),
  { ssr: false, loading: () => null },
);

interface GrahaHeroProps {
  planet: PlanetKey;
  height?: number;
  className?: string;
}

export function GrahaHero({ planet, height = 260, className }: GrahaHeroProps) {
  const low = useLowEndDevice();
  const v = PLANET_VISUAL[planet];

  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%', height }}
      aria-label={`${v.nameEn} 3D visualization`}
    >
      {low ? <HeroFallback planet={planet} /> : <Scene planet={planet} />}
    </div>
  );
}

function HeroFallback({ planet }: { planet: PlanetKey }) {
  const v = PLANET_VISUAL[planet];
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        className="absolute rounded-full j-glow-pulse"
        style={{
          width: '58%',
          aspectRatio: '1 / 1',
          background: `radial-gradient(circle at 35% 30%, ${v.color} 0%, ${v.color}cc 35%, ${v.color}55 70%, transparent 100%)`,
          boxShadow: `0 0 60px ${v.glow}`,
        }}
      />
      {v.ringed && (
        <div
          className="absolute rounded-full j-rotate-slow"
          style={{
            width: '84%',
            aspectRatio: '1 / 0.32',
            border: `2px solid ${v.color}aa`,
            boxShadow: `0 0 24px ${v.glow}`,
            transform: 'rotate(-18deg)',
          }}
        />
      )}
    </div>
  );
}
