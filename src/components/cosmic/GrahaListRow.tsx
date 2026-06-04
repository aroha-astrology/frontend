'use client';

import { useRef, useEffect } from 'react';
import { PLANET_VISUAL, type PlanetKey } from '@/components/3d/planet-registry';
import { GRAHA_DATA } from '@/data/cosmic/grahas';

interface GrahaListRowProps {
  planetKey: PlanetKey;
  isSelected?: boolean;
  onClick?: () => void;
  delay?: number;
}

export function GrahaListRow({ planetKey, isSelected, onClick, delay = 0 }: GrahaListRowProps) {
  const v = PLANET_VISUAL[planetKey];
  const g = GRAHA_DATA[planetKey];
  const rowRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { el.style.opacity = '1'; el.style.transform = 'none'; return; }

    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    const t = setTimeout(() => {
      el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <article
      ref={rowRef}
      className="flex gap-4 items-center group cursor-pointer p-2 rounded-xl transition-colors"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      onClick={onClick}
    >
      {/* Orbital icon: connector dot + circular planet orb */}
      <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
        {/* Gold dot on the connector line */}
        <div
          className="absolute -left-[19px] w-2 h-2 rounded-full"
          style={{ background: '#e5c100', boxShadow: '0 0 8px rgba(229,193,0,0.80)' }}
        />
        {/* Planet orb */}
        <div
          className="w-10 h-10 rounded-full border flex-shrink-0"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${v.color} 0%, ${v.color}99 50%, ${v.color}33 100%)`,
            borderColor: 'rgba(229,193,0,0.30)',
            boxShadow: isSelected
              ? `0 0 18px rgba(229,193,0,0.45)`
              : `0 0 15px ${v.glow}`,
          }}
        />
      </div>

      {/* Glass info panel */}
      <div
        className="flex-1 cd-glass-card p-4 relative overflow-hidden"
        style={{
          background: isSelected ? 'rgba(55,57,58,0.65)' : 'rgba(26,28,28,0.80)',
          borderColor: isSelected ? 'rgba(229,193,0,0.30)' : 'rgba(229,193,0,0.12)',
        }}
      >
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.04), transparent)',
            transform: 'translateX(-100%)',
          }}
        />
        <h3
          className="text-base font-bold text-white mb-0.5 relative z-10"
          style={{ fontFamily: 'var(--font-cinzel, serif)' }}
        >
          {g.nameEn}
          <span className="ml-2 text-[10px] font-normal" style={{ color: '#a1a1aa' }}>
            {g.nameSa}
          </span>
        </h3>
        <p className="text-xs leading-relaxed line-clamp-3 relative z-10" style={{ color: '#a1a1aa' }}>
          {g.signification}
        </p>
      </div>
    </article>
  );
}
