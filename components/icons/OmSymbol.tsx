import React from 'react';

interface OmSymbolProps {
  size?: number;
  color?: string;
  className?: string;
}

export const OmSymbol: React.FC<OmSymbolProps> = ({
  size = 48,
  color = '#D4AF37',
  className,
}) => {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main body — lower curved "3" shape */}
      <path
        d="M 28 72
           C 18 72 12 64 12 55
           C 12 44 20 38 30 38
           C 40 38 48 44 48 52
           C 48 58 44 62 38 62
           C 32 62 28 58 28 53"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Upper loop — the small upper curve */}
      <path
        d="M 28 53
           C 22 53 18 49 18 44
           C 18 37 24 32 32 32
           C 42 32 50 38 50 48"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right tail — the elongated tail curling right */}
      <path
        d="M 48 52
           C 58 52 68 48 72 40
           C 76 32 72 22 62 20"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lower tail — sweeping down and to the right */}
      <path
        d="M 28 72
           C 34 80 44 86 55 84
           C 66 82 74 72 72 62"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Virama — the curved hook above */}
      <path
        d="M 38 18
           C 44 14 54 14 58 20
           C 62 26 56 32 48 30"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot — anusvara dot above virama */}
      <circle
        cx="52"
        cy="8"
        r="4"
        fill={color}
      />
    </svg>
  );
};

export default OmSymbol;
