export function ProfileOrb() {
  return (
    <div className="relative flex flex-col items-center py-6">
      {/* Glass dome capsule */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 144,
          height: 180,
          borderRadius: 40,
          border: '1px solid rgba(123,95,202,0.40)',
          background: 'linear-gradient(160deg, rgba(20,16,50,0.90) 0%, rgba(10,9,25,0.95) 100%)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 40px rgba(123,95,202,0.18), inset 0 0 24px rgba(123,95,202,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Inner dome glow */}
        <div
          style={{
            position: 'absolute',
            width: 110,
            height: 110,
            borderRadius: '50%',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle at 50% 40%, rgba(123,95,202,0.22) 0%, rgba(80,60,160,0.10) 60%, transparent 100%)',
          }}
        />

        {/* Human silhouette SVG */}
        <svg
          width="100"
          height="130"
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Head */}
          <ellipse cx="50" cy="36" rx="20" ry="22"
            fill="rgba(200,190,240,0.18)"
            stroke="rgba(155,127,232,0.55)"
            strokeWidth="1.2"
          />
          {/* Inner face glow */}
          <ellipse cx="50" cy="34" rx="13" ry="15"
            fill="rgba(155,127,232,0.10)"
          />
          {/* Neck */}
          <rect x="43" y="56" width="14" height="10" rx="4"
            fill="rgba(200,190,240,0.12)"
            stroke="rgba(155,127,232,0.30)"
            strokeWidth="1"
          />
          {/* Shoulders / chest */}
          <path
            d="M10 130 C10 100, 20 80, 50 76 C80 80, 90 100, 90 130"
            fill="rgba(140,110,220,0.14)"
            stroke="rgba(155,127,232,0.40)"
            strokeWidth="1.2"
          />
          {/* Collar highlight */}
          <path
            d="M36 66 Q50 72 64 66"
            stroke="rgba(155,127,232,0.50)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* Glass reflection overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
            borderRadius: '40px 40px 0 0',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Outer ambient glow */}
      <div
        className="absolute top-6 pointer-events-none"
        style={{
          width: 144,
          height: 180,
          borderRadius: 40,
          boxShadow: '0 0 60px rgba(123,95,202,0.18), 0 0 100px rgba(80,50,180,0.12)',
        }}
      />
    </div>
  );
}
