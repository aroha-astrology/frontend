export function ProfileOrb() {
  return (
    <section className="w-full flex justify-center mt-2 mb-6">
      {/* Arched glass dome container */}
      <div
        className="relative flex items-end justify-center pb-4"
        style={{ width: 192, height: 224 }}
      >
        {/* Gradient glow from bottom */}
        <div
          className="absolute inset-0 rounded-t-full opacity-50"
          style={{
            background: 'linear-gradient(to top, rgba(229,193,0,0.12), transparent)',
            filter: 'blur(8px)',
          }}
        />
        {/* Glass dome frame */}
        <div
          className="absolute inset-0 rounded-t-full"
          style={{
            background: 'rgba(55,57,58,0.30)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(229,193,0,0.20)',
          }}
        />
        {/* Inner portal glow */}
        <div
          className="absolute"
          style={{
            width: 110, height: 110,
            borderRadius: '50%',
            top: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'radial-gradient(circle at 50% 40%, rgba(20,184,166,0.18) 0%, rgba(229,193,0,0.08) 60%, transparent 100%)',
          }}
        />
        {/* SVG silhouette */}
        <svg
          width="110"
          height="150"
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <ellipse cx="50" cy="36" rx="20" ry="22"
            fill="rgba(210,200,230,0.22)"
            stroke="rgba(229,193,0,0.40)"
            strokeWidth="1.2"
          />
          <ellipse cx="50" cy="34" rx="13" ry="15" fill="rgba(229,193,0,0.06)" />
          <rect x="43" y="56" width="14" height="10" rx="4"
            fill="rgba(210,200,230,0.14)"
            stroke="rgba(229,193,0,0.22)"
            strokeWidth="1"
          />
          <path
            d="M10 130 C10 100, 20 80, 50 76 C80 80, 90 100, 90 130"
            fill="rgba(180,160,220,0.16)"
            stroke="rgba(229,193,0,0.30)"
            strokeWidth="1.2"
          />
          <path d="M36 66 Q50 72 64 66"
            stroke="rgba(229,193,0,0.40)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        {/* Glass reflection */}
        <div
          className="absolute top-0 left-0 right-0 rounded-t-full pointer-events-none"
          style={{
            height: '45%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
          }}
        />
      </div>
    </section>
  );
}
