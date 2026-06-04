'use client';

import { useState, useRef, useEffect } from 'react';
import type { PlanetKey } from '@/components/3d/planet-registry';
import { GRAHA_ORDER } from '@/data/cosmic/grahas';
import { GrahaListRow } from './GrahaListRow';

export function GrahaExplorer() {
  const [selected, setSelected] = useState<PlanetKey>('Sun');
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { line.style.height = '100%'; return; }
    line.style.height = '0';
    const t = setTimeout(() => {
      line.style.transition = 'height 1.5s ease-out';
      line.style.height = '100%';
    }, 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="flex-1 px-4 pb-6 relative overflow-y-auto hide-scrollbar">
      {/* Central gold connector line */}
      <div className="absolute top-4 bottom-4 z-0" style={{ left: 40 }}>
        <div
          ref={lineRef}
          className="w-px"
          style={{
            height: 0,
            background: 'linear-gradient(to bottom, rgba(229,193,0,0), rgba(229,193,0,0.50) 15%, rgba(229,193,0,0.50) 85%, rgba(229,193,0,0))',
          }}
        />
      </div>

      <div className="flex flex-col gap-6 relative z-10 pt-4">
        {GRAHA_ORDER.map((key, i) => (
          <GrahaListRow
            key={key}
            planetKey={key}
            isSelected={selected === key}
            onClick={() => setSelected(key)}
            delay={i * 80}
          />
        ))}
      </div>
    </main>
  );
}
