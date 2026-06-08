import React from 'react';

interface SacredGeometryProps {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export const SacredGeometry: React.FC<SacredGeometryProps> = ({
  size = 48,
  color = '#D4AF37',
  opacity = 1,
  className,
}) => {
  const cx = 100;
  const cy = 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ opacity }}
    >
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r="88" fill="none" stroke={color} strokeWidth="1.5" />

      {/* Lotus petal ring (simplified — 8 arcs) */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * 45) * (Math.PI / 180);
        const nextAngle = ((i + 1) * 45) * (Math.PI / 180);
        const r = 88;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(nextAngle);
        const y2 = cy + r * Math.sin(nextAngle);
        return (
          <path
            key={`petal-${i}`}
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />
        );
      })}

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r="72" fill="none" stroke={color} strokeWidth="1" />

      {/* 4 upward triangles — simplified Sri Yantra upward */}
      <polygon
        points="100,30 142,95 58,95"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="100,42 132,88 68,88"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="100,22 150,102 50,102"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="100,52 126,82 74,82"
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 5 downward triangles */}
      <polygon
        points="100,170 142,105 58,105"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="100,158 132,112 68,112"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="100,178 150,98 50,98"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="100,148 126,118 74,118"
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="100,138 118,112 82,112"
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner circle */}
      <circle cx={cx} cy={cy} r="18" fill="none" stroke={color} strokeWidth="1.5" />

      {/* Bindu — central dot */}
      <circle cx={cx} cy={cy} r="4" fill={color} fillOpacity={0.9} />
    </svg>
  );
};

export default SacredGeometry;
