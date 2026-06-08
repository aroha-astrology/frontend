import React from 'react';

interface AIOrpProps {
  size?: number;
  primaryColor?: string;
  className?: string;
}

export const AIOrb: React.FC<AIOrpProps> = ({
  size = 48,
  primaryColor = '#D4AF37',
  className,
}) => {
  const highlight = '#F4D675';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer glow circle — dashed */}
      <circle
        cx="60"
        cy="60"
        r="55"
        fill="none"
        stroke={primaryColor}
        strokeWidth="1"
        strokeOpacity="0.4"
        strokeDasharray="4 6"
      />

      {/* Second outer ring */}
      <circle
        cx="60"
        cy="60"
        r="48"
        fill="none"
        stroke={primaryColor}
        strokeWidth="1"
        strokeOpacity="0.6"
      />

      {/* Middle ring */}
      <circle
        cx="60"
        cy="60"
        r="38"
        fill="none"
        stroke={primaryColor}
        strokeWidth="1.5"
      />

      {/* Inner circle with soft fill */}
      <circle
        cx="60"
        cy="60"
        r="26"
        fill={primaryColor}
        fillOpacity="0.08"
        stroke={primaryColor}
        strokeWidth="2"
      />

      {/* Core glow */}
      <circle
        cx="60"
        cy="60"
        r="14"
        fill={primaryColor}
        fillOpacity="0.15"
        stroke={highlight}
        strokeWidth="1.5"
      />

      {/* 8-point star — 4 long + 4 short alternating */}
      {/* Long arms */}
      <line x1="60" y1="50" x2="60" y2="46" stroke={highlight} strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="70" x2="60" y2="74" stroke={highlight} strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="60" x2="46" y2="60" stroke={highlight} strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="60" x2="74" y2="60" stroke={highlight} strokeWidth="2" strokeLinecap="round" />
      {/* Short diagonal arms */}
      <line x1="57" y1="57" x2="55" y2="55" stroke={highlight} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="63" y1="57" x2="65" y2="55" stroke={highlight} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="57" y1="63" x2="55" y2="65" stroke={highlight} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="63" y1="63" x2="65" y2="65" stroke={highlight} strokeWidth="1.5" strokeLinecap="round" />

      {/* Center dot */}
      <circle cx="60" cy="60" r="3" fill={highlight} />

      {/* Orbiting dots at 90-degree intervals on middle ring */}
      <circle cx="60" cy="22" r="3" fill={primaryColor} />
      <circle cx="98" cy="60" r="3" fill={primaryColor} />
      <circle cx="60" cy="98" r="3" fill={primaryColor} />
      <circle cx="22" cy="60" r="3" fill={primaryColor} />

      {/* Small accent arcs between orbiting dots */}
      <path
        d="M 72 28 A 38 38 0 0 1 92 48"
        fill="none"
        stroke={primaryColor}
        strokeWidth="1"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
      <path
        d="M 92 72 A 38 38 0 0 1 72 92"
        fill="none"
        stroke={primaryColor}
        strokeWidth="1"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
      <path
        d="M 48 92 A 38 38 0 0 1 28 72"
        fill="none"
        stroke={primaryColor}
        strokeWidth="1"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
      <path
        d="M 28 48 A 38 38 0 0 1 48 28"
        fill="none"
        stroke={primaryColor}
        strokeWidth="1"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default AIOrb;
