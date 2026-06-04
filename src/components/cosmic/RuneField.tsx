'use client';

import { FloatY } from '@/components/ui/motion-primitives';

const GLYPHS = [
  { glyph: '☉', x: '8%',  y: '6%',  size: 18, delay: 0,   opacity: 0.10 },
  { glyph: '☽', x: '88%', y: '9%',  size: 14, delay: 1.2, opacity: 0.08 },
  { glyph: '♂', x: '72%', y: '22%', size: 12, delay: 2.1, opacity: 0.09 },
  { glyph: '♃', x: '4%',  y: '32%', size: 16, delay: 0.6, opacity: 0.07 },
  { glyph: '♄', x: '92%', y: '44%', size: 13, delay: 1.8, opacity: 0.10 },
  { glyph: '☿', x: '18%', y: '55%', size: 11, delay: 3.0, opacity: 0.08 },
  { glyph: '♀', x: '80%', y: '62%', size: 14, delay: 0.9, opacity: 0.07 },
  { glyph: '☊', x: '44%', y: '8%',  size: 12, delay: 2.4, opacity: 0.09 },
  { glyph: '☋', x: '60%', y: '78%', size: 12, delay: 1.5, opacity: 0.08 },
  { glyph: '♈', x: '28%', y: '18%', size: 10, delay: 3.3, opacity: 0.06 },
  { glyph: '♑', x: '6%',  y: '72%', size: 10, delay: 1.0, opacity: 0.06 },
  { glyph: '♏', x: '85%', y: '82%', size: 11, delay: 2.7, opacity: 0.07 },
  { glyph: '✦',  x: '52%', y: '48%', size: 9,  delay: 0.3, opacity: 0.05 },
  { glyph: '✦',  x: '36%', y: '88%', size: 8,  delay: 1.7, opacity: 0.05 },
];

export function RuneField() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {GLYPHS.map((g, i) => (
        <FloatY
          key={i}
          distance={6}
          duration={5 + i * 0.7}
          className="absolute select-none"
          style={{ left: g.x, top: g.y } as React.CSSProperties}
        >
          <span
            style={{
              fontSize: g.size,
              opacity: g.opacity,
              color: 'var(--accent)',
              fontFamily: 'var(--font-emoji)',
              animationDelay: `${g.delay}s`,
            }}
          >
            {g.glyph}
          </span>
        </FloatY>
      ))}
    </div>
  );
}
