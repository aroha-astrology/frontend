import React from 'react';

interface MoonGlyphProps {
  size?: number;
  color?: string;
  className?: string;
}

export const MoonGlyph: React.FC<MoonGlyphProps> = ({
  size = 48,
  color = '#D4AF37',
  className,
}) => {
  const highlight = '#F4D675';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Crescent shape using clipPath — outer circle minus offset inner circle */}
      <defs>
        <clipPath id="crescent-clip">
          {/* Mask out the inner part to form a crescent */}
          <path d="M 40 8 A 32 32 0 1 1 39.9 8 Z" />
        </clipPath>
      </defs>

      {/* Main crescent — outer circle */}
      <circle
        cx="36"
        cy="42"
        r="28"
        fill={color}
        fillOpacity="0.08"
        stroke={color}
        strokeWidth="2"
      />

      {/* Inner cutout circle to create crescent illusion */}
      <circle
        cx="44"
        cy="36"
        r="22"
        fill="#05060A"
        stroke="none"
      />

      {/* Crescent outline arc (inner edge) */}
      <path
        d="M 26 20 A 22 22 0 0 1 58 52"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Craters on the crescent surface */}
      {/* Crater 1 */}
      <circle
        cx="22"
        cy="38"
        r="3"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        opacity="0.6"
      />
      {/* Crater 2 */}
      <circle
        cx="30"
        cy="58"
        r="2"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
      {/* Crater 3 */}
      <circle
        cx="16"
        cy="52"
        r="2.5"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.4"
      />

      {/* 4-point star near top-right of crescent */}
      {/* Vertical line */}
      <line x1="60" y1="14" x2="60" y2="22" stroke={highlight} strokeWidth="1.5" strokeLinecap="round" />
      {/* Horizontal line */}
      <line x1="56" y1="18" x2="64" y2="18" stroke={highlight} strokeWidth="1.5" strokeLinecap="round" />
      {/* Diagonal lines (shorter) */}
      <line x1="57.5" y1="15.5" x2="62.5" y2="20.5" stroke={highlight} strokeWidth="1" strokeLinecap="round" />
      <line x1="62.5" y1="15.5" x2="57.5" y2="20.5" stroke={highlight} strokeWidth="1" strokeLinecap="round" />

      {/* Tiny star dot at center */}
      <circle cx="60" cy="18" r="1.5" fill={highlight} />
    </svg>
  );
};

export default MoonGlyph;
