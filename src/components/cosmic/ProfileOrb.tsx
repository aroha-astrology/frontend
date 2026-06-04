'use client';

import { Planet3DHero } from '@/components/3d/Planet3DHero';

interface ProfileOrbProps {
  planet?: string;
}

export function ProfileOrb({ planet = 'Sun' }: ProfileOrbProps) {
  return (
    <div className="relative flex flex-col items-center py-6">
      {/* Capsule glass frame */}
      <div
        className="relative w-36 h-44 rounded-[2.5rem] overflow-hidden border border-border/50 shadow-[0_0_40px_rgba(212,175,55,0.18),inset_0_0_24px_rgba(212,175,55,0.06)]"
        style={{ background: 'var(--glass-3-bg)', backdropFilter: 'blur(12px)' }}
      >
        <Planet3DHero planet={planet} height={176} withStars />
      </div>

      {/* Outer glow ring */}
      <div
        className="absolute top-6 w-36 h-44 rounded-[2.5rem] pointer-events-none"
        style={{
          boxShadow: '0 0 60px rgba(212,175,55,0.12), 0 0 100px rgba(144,80,224,0.10)',
        }}
      />
    </div>
  );
}
