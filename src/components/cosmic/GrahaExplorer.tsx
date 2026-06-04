'use client';

import { useState, useRef } from 'react';
import type { PlanetKey } from '@/components/3d/planet-registry';
import { GRAHA_ORDER } from '@/data/cosmic/grahas';
import { GrahaHero } from './GrahaHero';
import { GrahaListRow } from './GrahaListRow';
import { GrahaDetailPanel } from './GrahaDetailPanel';
import { StaggerList, StaggerItem } from '@/components/ui/motion-primitives';

export function GrahaExplorer() {
  const [selected, setSelected] = useState<PlanetKey>('Sun');
  const heroRef = useRef<HTMLDivElement>(null);

  function handleSelect(key: PlanetKey) {
    setSelected(key);
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div>
      {/* 3D Hero */}
      <div ref={heroRef}>
        <GrahaHero planet={selected} height={260} />
      </div>

      {/* Detail panel for selected graha */}
      <GrahaDetailPanel planet={selected} />

      {/* Divider */}
      <div className="mx-4 my-4 border-t border-border/30" />

      {/* Graha list */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-primary/70 uppercase mb-3">
          Navagraha
        </p>
        <StaggerList className="space-y-2">
          {GRAHA_ORDER.map((key) => (
            <StaggerItem key={key}>
              <GrahaListRow
                planetKey={key}
                isSelected={selected === key}
                onClick={() => handleSelect(key)}
              />
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </div>
  );
}
