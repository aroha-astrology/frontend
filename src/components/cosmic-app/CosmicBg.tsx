'use client';

import { useMemo } from 'react';

export function CosmicBg() {
  const stars = useMemo(() =>
    Array.from({ length: 150 }, (_, i) => ({
      id: i,
      top: `${(i * 13 + 7) % 100}vh`,
      left: `${(i * 17 + 3) % 100}vw`,
      size: ((i * 7) % 20) / 10 + 1,
      duration: ((i * 11) % 30) / 10 + 2,
      delay: ((i * 3) % 50) / 10,
    })), []);

  return (
    <div className="cosmic-bg">
      <div className="nebula" />
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
