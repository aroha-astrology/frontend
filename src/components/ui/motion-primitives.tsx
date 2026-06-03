'use client';

import { type ReactNode, type HTMLAttributes } from 'react';

// ── MotionPage ─────────────────────────────────────────────
// Wrap each page's root content for enter animation
export function MotionPage({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

// ── StaggerList ────────────────────────────────────────────
export function StaggerList({
  children,
  className,
  fast: _fast,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; fast?: boolean }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

// ── StaggerItem ────────────────────────────────────────────
export function StaggerItem({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

// ── FadeIn ─────────────────────────────────────────────────
export function FadeIn({
  children,
  delay: _delay,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; delay?: number }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

// ── ScrollReveal ───────────────────────────────────────────
export function ScrollReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// ── CountUp ────────────────────────────────────────────────
export function CountUp({
  value,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  return <span className={className}>{value}</span>;
}

// ── Tilt3D ─────────────────────────────────────────────────
export function Tilt3D({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  return <div className={className}>{children}</div>;
}

// ── FloatY ─────────────────────────────────────────────────
export function FloatY({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
}) {
  return <div className={className}>{children}</div>;
}

// ── MagneticHover ──────────────────────────────────────────
export function MagneticHover({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  return <div className={className}>{children}</div>;
}
