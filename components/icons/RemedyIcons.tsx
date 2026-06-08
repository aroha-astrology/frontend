import React from 'react';

interface RemedyIconProps {
  size?: number;
  color?: string;
  className?: string;
}

const commonStroke = (color: string) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

// Love — heart with lotus petals at base
export const LoveIcon: React.FC<RemedyIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Heart */}
    <path
      d="M 20 32 C 14 26 6 20 6 14 C 6 9 10 6 14 7 C 16 7 18 9 20 11 C 22 9 24 7 26 7 C 30 6 34 9 34 14 C 34 20 26 26 20 32 Z"
      fill={color}
      fillOpacity={0.15}
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Small lotus petal left */}
    <path d="M 14 32 C 12 28 16 26 18 30 C 16 32 14 33 14 32 Z" {...commonStroke(color)} />
    {/* Small lotus petal right */}
    <path d="M 26 32 C 28 28 24 26 22 30 C 24 32 26 33 26 32 Z" {...commonStroke(color)} />
  </svg>
);

// Career — mountain peak with star above
export const CareerIcon: React.FC<RemedyIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Mountain peaks */}
    <path d="M 4 34 L 16 12 L 24 22 L 30 16 L 36 34 Z" {...commonStroke(color)} />
    {/* Star above peak */}
    <path
      d="M 30 8 L 31.2 11.6 L 35 11.6 L 32.2 13.8 L 33.4 17.4 L 30 15.2 L 26.6 17.4 L 27.8 13.8 L 25 11.6 L 28.8 11.6 Z"
      fill={color}
      fillOpacity={0.3}
      stroke={color}
      strokeWidth={1.2}
      strokeLinejoin="round"
    />
  </svg>
);

// Health — lotus flower (simplified)
export const HealthIcon: React.FC<RemedyIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* 5 petals */}
    <path d="M 20 20 C 18 14 18 6 20 4 C 22 6 22 14 20 20 Z" {...commonStroke(color)} fill={color} fillOpacity={0.15} />
    <path d="M 20 20 C 26 18 32 14 34 12 C 32 16 26 22 20 20 Z" {...commonStroke(color)} fill={color} fillOpacity={0.15} />
    <path d="M 20 20 C 26 22 30 28 30 32 C 26 30 20 26 20 20 Z" {...commonStroke(color)} fill={color} fillOpacity={0.15} />
    <path d="M 20 20 C 14 26 10 30 10 32 C 10 28 14 22 20 20 Z" {...commonStroke(color)} fill={color} fillOpacity={0.15} />
    <path d="M 20 20 C 14 18 8 16 6 12 C 8 14 14 18 20 20 Z" {...commonStroke(color)} fill={color} fillOpacity={0.15} />
    {/* Center */}
    <circle cx="20" cy="20" r="3.5" fill={color} fillOpacity={0.4} stroke={color} strokeWidth={1.5} />
    {/* Stem */}
    <line x1="20" y1="34" x2="20" y2="38" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

// Finance — coin with star
export const FinanceIcon: React.FC<RemedyIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Coin outer circle */}
    <circle cx="20" cy="22" r="14" fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1.8} />
    {/* Inner circle */}
    <circle cx="20" cy="22" r="9" fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
    {/* Star inside coin */}
    <path
      d="M 20 16 L 21.4 20 L 25.6 20 L 22.2 22.4 L 23.6 26.4 L 20 24 L 16.4 26.4 L 17.8 22.4 L 14.4 20 L 18.6 20 Z"
      fill={color}
      fillOpacity={0.5}
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
    {/* Upward arrow above coin */}
    <path d="M 20 4 L 20 10 M 17 7 L 20 4 L 23 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Peace — circle with sun rays (halo)
export const PeaceIcon: React.FC<RemedyIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Central circle */}
    <circle cx="20" cy="20" r="8" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.8} />
    {/* 8 rays */}
    {Array.from({ length: 8 }, (_, i) => {
      const angle = (i * 45) * (Math.PI / 180);
      const innerR = 10;
      const outerR = 16;
      const x1 = 20 + innerR * Math.cos(angle);
      const y1 = 20 + innerR * Math.sin(angle);
      const x2 = 20 + outerR * Math.cos(angle);
      const y2 = 20 + outerR * Math.sin(angle);
      return (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      );
    })}
    {/* Outer halo ring */}
    <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.4} />
  </svg>
);

// Spiritual — third eye / flame with inner spark
export const SpiritualIcon: React.FC<RemedyIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Outer flame */}
    <path
      d="M 20 36 C 10 32 8 24 12 16 C 14 10 18 6 20 4 C 22 6 26 10 28 16 C 32 24 30 32 20 36 Z"
      fill={color}
      fillOpacity={0.12}
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner flame */}
    <path
      d="M 20 30 C 15 26 14 20 16 14 C 17 11 19 8 20 6 C 21 8 23 11 24 14 C 26 20 25 26 20 30 Z"
      fill={color}
      fillOpacity={0.25}
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner spark / third eye */}
    <ellipse
      cx="20"
      cy="22"
      rx="4"
      ry="2.5"
      fill="none"
      stroke={color}
      strokeWidth={1.2}
    />
    {/* Eye pupil dot */}
    <circle cx="20" cy="22" r="1.5" fill={color} />
  </svg>
);
