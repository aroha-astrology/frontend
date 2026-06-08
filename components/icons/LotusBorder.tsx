import React from 'react';

interface LotusBorderProps {
  size?: number;
  color?: string;
  className?: string;
}

export const LotusBorder: React.FC<LotusBorderProps> = ({
  size = 48,
  color = '#D4AF37',
  className,
}) => {
  const strokeProps = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Stem/stalk from corner */}
      <path d="M 4 4 C 8 8 12 14 14 20" {...strokeProps} />

      {/* 3 petals pointing rightward — stacked along right axis */}
      {/* Petal 1 — upper right */}
      <path
        d="M 14 20 C 20 14 34 12 38 18 C 32 22 20 22 14 20 Z"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Petal 2 — middle right */}
      <path
        d="M 14 20 C 22 18 38 20 40 28 C 32 28 20 26 14 20 Z"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Petal 3 — lower right */}
      <path
        d="M 14 20 C 20 26 30 36 28 44 C 22 40 16 30 14 20 Z"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3 petals pointing downward — stacked along down axis */}
      {/* Petal 4 — left down */}
      <path
        d="M 14 20 C 8 26 6 38 12 42 C 16 36 16 24 14 20 Z"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Petal 5 — middle down */}
      <path
        d="M 14 20 C 16 28 20 40 28 44 C 22 40 14 28 14 20 Z"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Petal 6 — right down */}
      <path
        d="M 14 20 C 22 22 34 26 38 34 C 30 36 20 28 14 20 Z"
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center bud — small circle at petal origin */}
      <circle cx="14" cy="20" r="3" fill={color} fillOpacity={0.4} stroke={color} strokeWidth="1.5" />

      {/* Decorative corner dot */}
      <circle cx="4" cy="4" r="2" fill={color} fillOpacity={0.6} />
    </svg>
  );
};

export default LotusBorder;
