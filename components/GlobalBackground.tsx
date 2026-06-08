"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
}

export default function GlobalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const shootingStarIdRef = useRef(0);

  // Gold dust canvas particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize 20 particles
    particlesRef.current = Array.from({ length: 20 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.5 + 0.2),
      opacity: Math.random() * 0.06,
      size: Math.random() * 2 + 0.5,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.fill();
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Shooting stars interval: 15–20s
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = 15000 + Math.random() * 5000;
      timeout = setTimeout(() => {
        const id = ++shootingStarIdRef.current;
        const startX = Math.random() * 80 + 10;
        const startY = Math.random() * 40;
        setShootingStars((prev) => [...prev, { id, startX, startY }]);
        setTimeout(() => {
          setShootingStars((prev) => prev.filter((s) => s.id !== id));
        }, 1500);
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timeout);
  }, []);

  // Deterministic star positions to avoid hydration mismatch
  const stars = Array.from({ length: 40 }, (_, i) => ({
    left: ((i * 37 + 13) % 100),
    top: ((i * 53 + 7) % 100),
    delay: ((i * 17 + 3) % 50) * 0.1,
    duration: 2 + ((i * 11 + 5) % 30) * 0.1,
    size: ((i * 7 + 2) % 2) === 0 ? 1 : 1.5,
  }));

  return (
    <>
      {/* Twinkle keyframes */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* 1. Moon glow layer */}
      <motion.div
        className="fixed pointer-events-none z-0"
        style={{
          top: "-4rem",
          right: "-4rem",
          width: "16rem",
          height: "16rem",
          background: "rgba(212,175,55,0.04)",
          borderRadius: "9999px",
          filter: "blur(64px)",
        }}
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed pointer-events-none z-0"
        style={{
          bottom: "-3rem",
          left: "-3rem",
          width: "12rem",
          height: "12rem",
          background: "rgba(212,175,55,0.02)",
          borderRadius: "9999px",
          filter: "blur(64px)",
        }}
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 2. Sacred geometry SVG layer (0.04 opacity) */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.04,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="sacredGeometry"
            x="0"
            y="0"
            width="400"
            height="400"
            patternUnits="userSpaceOnUse"
          >
            {/* Outer circle */}
            <circle cx="200" cy="200" r="180" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
            {/* Middle circle */}
            <circle cx="200" cy="200" r="120" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
            {/* Inner circle */}
            <circle cx="200" cy="200" r="60" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
            {/* Innermost circle */}
            <circle cx="200" cy="200" r="20" fill="none" stroke="#D4AF37" strokeWidth="0.5" />

            {/* Upward triangle (large) */}
            <polygon
              points="200,30 352,270 48,270"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="0.5"
            />
            {/* Downward triangle (large) */}
            <polygon
              points="200,370 48,130 352,130"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="0.5"
            />
            {/* Upward triangle (medium) */}
            <polygon
              points="200,80 310,250 90,250"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="0.5"
            />
            {/* Downward triangle (medium) */}
            <polygon
              points="200,320 90,150 310,150"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="0.5"
            />
            {/* Upward triangle (small) */}
            <polygon
              points="200,140 260,240 140,240"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="0.5"
            />
            {/* Downward triangle (small) */}
            <polygon
              points="200,260 140,160 260,160"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="0.5"
            />

            {/* Lotus petals (8 petals) */}
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i * Math.PI * 2) / 8;
              const cx = 200 + Math.cos(angle) * 90;
              const cy = 200 + Math.sin(angle) * 90;
              return (
                <ellipse
                  key={i}
                  cx={cx}
                  cy={cy}
                  rx="28"
                  ry="14"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="0.5"
                  transform={`rotate(${(angle * 180) / Math.PI + 90}, ${cx}, ${cy})`}
                />
              );
            })}

            {/* Outer lotus petals (16 petals) */}
            {Array.from({ length: 16 }, (_, i) => {
              const angle = (i * Math.PI * 2) / 16;
              const cx = 200 + Math.cos(angle) * 150;
              const cy = 200 + Math.sin(angle) * 150;
              return (
                <ellipse
                  key={i}
                  cx={cx}
                  cy={cy}
                  rx="22"
                  ry="10"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="0.3"
                  transform={`rotate(${(angle * 180) / Math.PI + 90}, ${cx}, ${cy})`}
                />
              );
            })}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sacredGeometry)" />
      </svg>

      {/* 3. Mandala rings layer */}
      {/* Outer ring: 300px, 24 dots, clockwise 120s */}
      <svg
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          width: 300,
          height: 300,
          marginTop: -150,
          marginLeft: -150,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.03,
        }}
      >
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          style={{ originX: "150px", originY: "150px" }}
        >
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i * Math.PI * 2) / 24;
            const x = 150 + Math.cos(angle) * 140;
            const y = 150 + Math.sin(angle) * 140;
            return (
              <circle key={i} cx={x} cy={y} r="3" fill="#D4AF37" />
            );
          })}
          <circle cx="150" cy="150" r="140" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
        </motion.g>
      </svg>

      {/* Inner ring: 200px, 12 diamonds, counter-clockwise 180s */}
      <svg
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          width: 200,
          height: 200,
          marginTop: -100,
          marginLeft: -100,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.03,
        }}
      >
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
          style={{ originX: "100px", originY: "100px" }}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * Math.PI * 2) / 12;
            const cx = 100 + Math.cos(angle) * 90;
            const cy = 100 + Math.sin(angle) * 90;
            return (
              <rect
                key={i}
                x={cx - 4}
                y={cy - 4}
                width="8"
                height="8"
                fill="#D4AF37"
                transform={`rotate(45, ${cx}, ${cy})`}
              />
            );
          })}
          <circle cx="100" cy="100" r="90" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
        </motion.g>
      </svg>

      {/* 4. Gold dust canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* 5. Twinkling stars */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {stars.map((star, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              borderRadius: "9999px",
              background: "#D4AF37",
              animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* 6. Shooting stars */}
      <AnimatePresence>
        {shootingStars.map((star) => (
          <motion.div
            key={star.id}
            style={{
              position: "fixed",
              left: `${star.startX}%`,
              top: `${star.startY}%`,
              width: 80,
              height: 1,
              background:
                "linear-gradient(90deg, rgba(212,175,55,0.8) 0%, rgba(212,175,55,0) 100%)",
              pointerEvents: "none",
              zIndex: 0,
              borderRadius: 4,
            }}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 30 }}
            animate={{ opacity: [0, 1, 0], x: 120, y: 60 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </>
  );
}
