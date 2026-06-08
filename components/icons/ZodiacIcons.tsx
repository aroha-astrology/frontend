import React from 'react';

interface ZodiacIconProps {
  size?: number;
  color?: string;
  className?: string;
}

const commonProps = (color: string) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: 2 as number,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const Aries: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ram horns — two curves rising from center, arching outward */}
    <path d="M 20 28 C 20 20 12 14 8 18 C 4 22 8 30 14 28" {...commonProps(color)} />
    <path d="M 20 28 C 20 20 28 14 32 18 C 36 22 32 30 26 28" {...commonProps(color)} />
    {/* Center stem going down */}
    <line x1="20" y1="28" x2="20" y2="34" {...commonProps(color)} />
  </svg>
);

export const Taurus: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Circle body */}
    <circle cx="20" cy="26" r="10" {...commonProps(color)} />
    {/* Two horns curving upward */}
    <path d="M 12 20 C 10 14 10 8 16 8" {...commonProps(color)} />
    <path d="M 28 20 C 30 14 30 8 24 8" {...commonProps(color)} />
  </svg>
);

export const Gemini: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Left vertical */}
    <line x1="14" y1="10" x2="14" y2="30" {...commonProps(color)} />
    {/* Right vertical */}
    <line x1="26" y1="10" x2="26" y2="30" {...commonProps(color)} />
    {/* Top horizontal with small curves */}
    <path d="M 10 10 Q 14 7 20 8 Q 26 7 30 10" {...commonProps(color)} />
    {/* Bottom horizontal with small curves */}
    <path d="M 10 30 Q 14 33 20 32 Q 26 33 30 30" {...commonProps(color)} />
    {/* Middle horizontal */}
    <line x1="14" y1="20" x2="26" y2="20" {...commonProps(color)} />
  </svg>
);

export const Cancer: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* 69 symbol — two overlapping circles facing opposite directions */}
    {/* Top circle (faces right) */}
    <path d="M 14 18 C 14 10 26 10 26 18 C 26 22 22 24 20 22" {...commonProps(color)} />
    {/* Bottom circle (faces left) */}
    <path d="M 26 22 C 26 30 14 30 14 22 C 14 18 18 16 20 18" {...commonProps(color)} />
  </svg>
);

export const Leo: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Circle body */}
    <circle cx="22" cy="24" r="8" {...commonProps(color)} />
    {/* Mane/tail — curved arc sweeping up and back */}
    <path d="M 15 22 C 12 16 14 8 20 8 C 24 8 26 12 24 16" {...commonProps(color)} />
    {/* Tail curling right */}
    <path d="M 30 24 C 34 24 36 28 34 32 C 32 34 30 32 30 30" {...commonProps(color)} />
  </svg>
);

export const Virgo: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* M shape */}
    <path d="M 8 28 L 8 12 C 8 8 14 8 14 14 L 14 28" {...commonProps(color)} />
    <path d="M 14 14 C 14 8 20 8 20 14 L 20 28" {...commonProps(color)} />
    <path d="M 20 14 C 20 8 26 8 26 14 L 26 26" {...commonProps(color)} />
    {/* Loop on the right tail */}
    <path d="M 26 26 C 26 32 32 34 34 30 C 36 26 32 22 28 24" {...commonProps(color)} />
  </svg>
);

export const Libra: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Omega shape on top */}
    <path d="M 12 22 C 12 14 16 10 20 10 C 24 10 28 14 28 22" {...commonProps(color)} />
    {/* Flat base line */}
    <line x1="8" y1="28" x2="32" y2="28" {...commonProps(color)} />
    {/* Short line above base */}
    <line x1="8" y1="22" x2="32" y2="22" {...commonProps(color)} />
  </svg>
);

export const Scorpio: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* M shape — like Virgo but with arrow tail */}
    <path d="M 6 28 L 6 14 C 6 10 12 10 12 16 L 12 28" {...commonProps(color)} />
    <path d="M 12 16 C 12 10 18 10 18 16 L 18 28" {...commonProps(color)} />
    <path d="M 18 16 C 18 10 24 10 24 16 L 24 28" {...commonProps(color)} />
    {/* Arrow tail pointing upper-right */}
    <path d="M 24 28 C 28 28 32 24 32 20" {...commonProps(color)} />
    <path d="M 28 16 L 32 20 L 36 16" {...commonProps(color)} />
  </svg>
);

export const Sagittarius: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Arrow shaft pointing upper-right */}
    <line x1="10" y1="30" x2="30" y2="10" {...commonProps(color)} />
    {/* Arrowhead */}
    <path d="M 30 10 L 20 10 M 30 10 L 30 20" {...commonProps(color)} />
    {/* Cross bar on shaft */}
    <line x1="16" y1="24" x2="24" y2="16" stroke="none" />
  </svg>
);

export const Capricorn: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* V shape with loop on left */}
    <path d="M 8 10 C 8 16 10 22 14 28 C 18 34 22 34 26 28 C 30 22 32 16 32 28" {...commonProps(color)} />
    {/* Left side loop */}
    <path d="M 8 10 C 4 14 6 20 10 18 C 14 16 12 10 8 10" {...commonProps(color)} />
    {/* Right tail curling back */}
    <path d="M 32 28 C 36 30 38 26 36 22" {...commonProps(color)} />
  </svg>
);

export const Aquarius: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Top wavy line */}
    <path d="M 6 16 C 10 12 14 20 20 16 C 26 12 30 20 34 16" {...commonProps(color)} />
    {/* Bottom wavy line */}
    <path d="M 6 24 C 10 20 14 28 20 24 C 26 20 30 28 34 24" {...commonProps(color)} />
  </svg>
);

export const Pisces: React.FC<ZodiacIconProps> = ({ size = 48, color = '#D4AF37', className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Left arc — fish facing left */}
    <path d="M 20 10 C 10 10 6 14 6 20 C 6 26 10 30 20 30" {...commonProps(color)} />
    {/* Right arc — fish facing right */}
    <path d="M 20 10 C 30 10 34 14 34 20 C 34 26 30 30 20 30" {...commonProps(color)} />
    {/* Horizontal connecting line */}
    <line x1="8" y1="20" x2="32" y2="20" {...commonProps(color)} />
  </svg>
);
