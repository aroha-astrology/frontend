'use client';

import { useEffect, useRef } from 'react';

export function Stardust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;

    type Particle = { x: number; y: number; radius: number; color: string; vx: number; vy: number };
    let particles: Particle[] = [];
    let width = 0, height = 0;

    const init = () => {
      width = canvas.parentElement?.offsetWidth ?? window.innerWidth;
      height = canvas.parentElement?.offsetHeight ?? window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.4,
        color: Math.random() > 0.5
          ? `rgba(255,255,255,${(Math.random() * 0.4 + 0.1).toFixed(2)})`
          : `rgba(229,193,0,${(Math.random() * 0.4 + 0.1).toFixed(2)})`,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.08,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (!prefersReduced) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }
      }
      if (!prefersReduced) rafId = requestAnimationFrame(draw);
    };

    init();
    draw();

    const onResize = () => { init(); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
