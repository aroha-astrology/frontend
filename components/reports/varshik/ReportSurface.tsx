"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import "./varshik.css";

/**
 * The report's look. Wrap any report content in this and every chart inside picks up the app's own
 * colours (so it follows dark, light and both skins), and its animations obey the device's
 * reduced-motion setting.
 */
export default function ReportSurface({
  children,
  className = "",
  page = false,
}: {
  children: ReactNode;
  className?: string;
  /** Paint the app's page background, with a faint gold glow, behind the content. */
  page?: boolean;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`vk-surface ${page ? "vk-page" : ""} ${className}`}>{children}</div>
    </MotionConfig>
  );
}

/** One report section: eyebrow, serif title, a gold rule, then the chart or text. */
export function ReportSection({
  id,
  eyebrow,
  title,
  children,
  beam = false,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  /** A light that travels once round the frame; for the one hero section per page. */
  beam?: boolean;
}) {
  return (
    <section id={id} className={`vk-panel flex flex-col gap-4 p-5 ${beam ? "vk-beam" : ""}`}>
      <header className="flex min-w-0 flex-col gap-2">
        {eyebrow ? <span className="vk-eyebrow">{eyebrow}</span> : null}
        <h2 className="vk-title m-0 min-w-0 break-words">{title}</h2>
        <hr className="vk-rule m-0" aria-hidden="true" />
      </header>
      {children}
    </section>
  );
}
