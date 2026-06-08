import React from 'react';

interface LotusIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const LotusIcon: React.FC<LotusIconProps> = ({
  size = 48,
  color = '#D4AF37',
  className,
}) => {
  // Generate 8 petals, each rotated 45 degrees apart
  const petals = Array.from({ length: 8 }, (_, i) => {
    const angle = i * 45;
    return (
      <g key={i} transform={`rotate(${angle}, 50, 50)`}>
        {/* Petal: elongated teardrop pointing upward from center */}
        <path
          d="M 50 50 C 44 40 44 22 50 16 C 56 22 56 40 50 50 Z"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {petals}
      {/* Center circle */}
      <circle
        cx="50"
        cy="50"
        r="8"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Inner detail circle */}
      <circle
        cx="50"
        cy="50"
        r="4"
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth="1"
      />
      {/* Center dot */}
      <circle
        cx="50"
        cy="50"
        r="1.5"
        fill={color}
      />
    </svg>
  );
};

export default LotusIcon;
