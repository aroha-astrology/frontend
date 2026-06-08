"use client";

export default function SacredGeometryBg() {
  const CX = 200;
  const CY = 200;

  const upTriangle = (r: number) => {
    const pts = [0, 120, 240].map((a) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return `${(CX + r * Math.cos(rad)).toFixed(2)},${(CY + r * Math.sin(rad)).toFixed(2)}`;
    });
    return pts.join(" ");
  };

  const downTriangle = (r: number) => {
    const pts = [60, 180, 300].map((a) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return `${(CX + r * Math.cos(rad)).toFixed(2)},${(CY + r * Math.sin(rad)).toFixed(2)}`;
    });
    return pts.join(" ");
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
      style={{ opacity: 0.05 }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="sri-yantra-tile"
            x="0" y="0"
            width="400" height="400"
            patternUnits="userSpaceOnUse"
          >
            {/* Outer circles */}
            <circle cx={CX} cy={CY} r={185} fill="none" stroke="#D4AF37" strokeWidth="0.8" />
            <circle cx={CX} cy={CY} r={175} fill="none" stroke="#D4AF37" strokeWidth="0.4" />
            <circle cx={CX} cy={CY} r={145} fill="none" stroke="#D4AF37" strokeWidth="0.6" />
            <circle cx={CX} cy={CY} r={120} fill="none" stroke="#D4AF37" strokeWidth="0.4" />
            <circle cx={CX} cy={CY} r={80}  fill="none" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx={CX} cy={CY} r={32}  fill="none" stroke="#D4AF37" strokeWidth="0.5" />

            {/* Interlocked triangles — 4 up, 5 down like Sri Yantra approximation */}
            {[120, 100, 80, 60].map((r, i) => (
              <polygon
                key={`up-${i}`}
                points={upTriangle(r)}
                fill="none"
                stroke="#D4AF37"
                strokeWidth="0.7"
              />
            ))}
            {[130, 110, 90, 70, 50].map((r, i) => (
              <polygon
                key={`dn-${i}`}
                points={downTriangle(r)}
                fill="none"
                stroke="#D4AF37"
                strokeWidth="0.7"
              />
            ))}

            {/* Lotus petals — 8 outer */}
            {Array.from({ length: 8 }, (_, i) => {
              const a = i * 45;
              const rad = (a * Math.PI) / 180;
              const px = CX + 155 * Math.cos(rad);
              const py = CY + 155 * Math.sin(rad);
              return (
                <ellipse
                  key={`p8-${i}`}
                  cx={px.toFixed(2)}
                  cy={py.toFixed(2)}
                  rx="14"
                  ry="28"
                  transform={`rotate(${a}, ${px.toFixed(2)}, ${py.toFixed(2)})`}
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="0.6"
                />
              );
            })}

            {/* Lotus petals — 16 inner */}
            {Array.from({ length: 16 }, (_, i) => {
              const a = i * 22.5;
              const rad = (a * Math.PI) / 180;
              const px = CX + 130 * Math.cos(rad);
              const py = CY + 130 * Math.sin(rad);
              return (
                <ellipse
                  key={`p16-${i}`}
                  cx={px.toFixed(2)}
                  cy={py.toFixed(2)}
                  rx="8"
                  ry="20"
                  transform={`rotate(${a}, ${px.toFixed(2)}, ${py.toFixed(2)})`}
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="0.4"
                />
              );
            })}

            {/* Central bindu */}
            <circle cx={CX} cy={CY} r="4" fill="rgba(212,175,55,0.6)" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#sri-yantra-tile)" />
      </svg>
    </div>
  );
}
