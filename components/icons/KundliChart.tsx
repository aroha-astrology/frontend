import React from 'react';

interface KundliChartProps {
  size?: number;
  color?: string;
  className?: string;
  showLabels?: boolean;
}

export const KundliChart: React.FC<KundliChartProps> = ({
  size = 48,
  color = '#D4AF37',
  className,
  showLabels = false,
}) => {
  const strokeProps = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  // House label positions (North Indian style, 12 houses)
  // Outer square: 10,10 → 190,190
  // Inner diamond corners: top(100,30) right(170,100) bottom(100,170) left(30,100)
  const labelPositions = [
    { x: 100, y: 22, label: '1' },   // top of inner diamond (lagna/ascendant)
    { x: 148, y: 52, label: '2' },   // upper-right triangle
    { x: 175, y: 48, label: '3' },   // upper-right corner area
    { x: 162, y: 100, label: '4' },  // right of inner diamond
    { x: 175, y: 152, label: '5' },  // lower-right corner area
    { x: 148, y: 148, label: '6' },  // lower-right triangle
    { x: 100, y: 178, label: '7' },  // bottom of inner diamond
    { x: 52, y: 148, label: '8' },   // lower-left triangle
    { x: 25, y: 152, label: '9' },   // lower-left corner area
    { x: 38, y: 100, label: '10' },  // left of inner diamond
    { x: 25, y: 48, label: '11' },   // upper-left corner area
    { x: 52, y: 52, label: '12' },   // upper-left triangle
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer square */}
      <rect x="10" y="10" width="180" height="180" {...strokeProps} />

      {/* Inner diamond (square rotated 45°) */}
      <polygon
        points="100,30 170,100 100,170 30,100"
        {...strokeProps}
      />

      {/* Lines from midpoints of outer square to corners of inner diamond */}
      {/* Top mid (100,10) → top diamond (100,30) */}
      <line x1="100" y1="10" x2="100" y2="30" {...strokeProps} />
      {/* Right mid (190,100) → right diamond (170,100) */}
      <line x1="190" y1="100" x2="170" y2="100" {...strokeProps} />
      {/* Bottom mid (100,190) → bottom diamond (100,170) */}
      <line x1="100" y1="190" x2="100" y2="170" {...strokeProps} />
      {/* Left mid (10,100) → left diamond (30,100) */}
      <line x1="10" y1="100" x2="30" y2="100" {...strokeProps} />

      {/* Corner lines — outer corners to inner diamond vertices */}
      {/* Top-left corner (10,10) → top diamond (100,30) and left diamond (30,100) */}
      <line x1="10" y1="10" x2="100" y2="30" {...strokeProps} />
      <line x1="10" y1="10" x2="30" y2="100" {...strokeProps} />
      {/* Top-right corner (190,10) → top diamond (100,30) and right diamond (170,100) */}
      <line x1="190" y1="10" x2="100" y2="30" {...strokeProps} />
      <line x1="190" y1="10" x2="170" y2="100" {...strokeProps} />
      {/* Bottom-right corner (190,190) → right diamond (170,100) and bottom diamond (100,170) */}
      <line x1="190" y1="190" x2="170" y2="100" {...strokeProps} />
      <line x1="190" y1="190" x2="100" y2="170" {...strokeProps} />
      {/* Bottom-left corner (10,190) → bottom diamond (100,170) and left diamond (30,100) */}
      <line x1="10" y1="190" x2="100" y2="170" {...strokeProps} />
      <line x1="10" y1="190" x2="30" y2="100" {...strokeProps} />

      {/* Optional house number labels */}
      {showLabels && labelPositions.map(({ x, y, label }) => (
        <text
          key={label}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="9"
          fontFamily="serif"
          fillOpacity="0.7"
        >
          {label}
        </text>
      ))}
    </svg>
  );
};

export default KundliChart;
