"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  life: number;
  maxLife: number;
}

interface Star {
  id: number;
  startX: number;
  startY: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const starIdRef = useRef(0);

  /* ── Gold dust (canvas) ── */
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

    const spawn = (): Particle => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 10,
      vy: -(Math.random() * 0.6 + 0.4),
      vx: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.4 + 0.4,
      life: 0,
      maxLife: Math.random() * 200 + 120,
    });

    const particles: Particle[] = Array.from({ length: 40 }, () => {
      const p = spawn();
      p.y = Math.random() * window.innerHeight;
      p.life = Math.random() * p.maxLife;
      return p;
    });

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life > p.maxLife) Object.assign(particles[i], spawn());

        const progress = p.life / p.maxLife;
        const opacity = progress < 0.2
          ? progress / 0.2
          : progress > 0.8
            ? (1 - progress) / 0.2
            : 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${opacity * 0.7})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ── Shooting stars (Framer Motion) ── */
  useEffect(() => {
    const fire = () => {
      const id = ++starIdRef.current;
      const startX = Math.random() * 200 - 200;
      const startY = Math.random() * 200 - 100;
      setStars((s) => [...s, { id, startX, startY }]);
      setTimeout(() => setStars((s) => s.filter((x) => x.id !== id)), 2000);
    };

    const schedule = () => {
      const delay = 15000 + Math.random() * 8000;
      return setTimeout(() => { fire(); schedule(); }, delay);
    };

    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      <AnimatePresence>
        {stars.map((star) => (
          <motion.div
            key={star.id}
            initial={{ x: star.startX, y: star.startY, opacity: 0 }}
            animate={{ x: star.startX + (typeof window !== "undefined" ? window.innerWidth + 400 : 1200), y: star.startY + 200, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.5, ease: "easeIn" }}
            className="fixed pointer-events-none z-0"
            style={{
              width: 120,
              height: 2,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
              borderRadius: 2,
              top: 0,
              left: 0,
              transform: "rotate(-20deg)",
            }}
          />
        ))}
      </AnimatePresence>
    </>
  );
}
