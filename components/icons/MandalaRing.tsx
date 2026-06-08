import React from 'react';

interface MandalaRingProps {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export const MandalaRing: React.FC<MandalaRingProps> = ({
  size = 48,
  color = '#D4AF37',
  opacity = 1,
  className,
}) => {
  const outerR = 92;
  const innerR = 68;
  const midR = 80;
  const cx = 100;
  const cy = 100;
  const count = 12;

  // Small circles on the middle ring
  const midCircles = Array.from({ length: count }, (_, i) => {
    const angle = (i * 360) / count;
    const rad = (angle * Math.PI) / 180;
    const x = cx + midR * Math.cos(rad);
    const y = cy + midR * Math.sin(rad);
    return (
      <circle
        key={`mid-${i}`}
        cx={x}
        cy={y}
        r="4"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
    );
  });

  // Diamond/leaf shapes between the rings
  const diamonds = Array.from({ length: count }, (_, i) => {
    const angle = ((i * 360) / count + 15) * (Math.PI / 180);
    const innerX = cx + (innerR + 4) * Math.cos(angle);
    const innerY = cy + (innerR + 4) * Math.sin(angle);
    const outerX = cx + (outerR - 4) * Math.cos(angle);
    const outerY = cy + (outerR - 4) * Math.sin(angle);
    // Side points perpendicular
    const perpAngle = angle + Math.PI / 2;
    const side = 5;
    const midX = cx + midR * Math.cos(angle);
    const midY = cy + midR * Math.sin(angle);
    const leftX = midX + side * Math.cos(perpAngle);
    const leftY = midY + side * Math.sin(perpAngle);
    const rightX = midX - side * Math.cos(perpAngle);
    const rightY = midY - side * Math.sin(perpAngle);

    return (
      <path
        key={`diamond-${i}`}
        d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${outerX} ${outerY} L ${rightX} ${rightY} Z`}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  });

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
      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      {/* Inner circle */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      {/* Middle ring (guide — thin) */}
      <circle
        cx={cx}
        cy={cy}
        r={midR}
        fill="none"
        stroke={color}
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />
      {diamonds}
      {midCircles}
    </svg>
  );
};

export default MandalaRing;
