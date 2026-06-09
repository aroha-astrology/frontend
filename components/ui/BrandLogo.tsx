"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Theme-aware Aroha emblem. Two source assets:
 *   - /logo_transparent.png       → shown in dark mode
 *   - /logo_dark_transparent.png  → shown in light mode
 * Square 1:1 source, so pass a single `size`.
 */
export default function BrandLogo({
  size,
  priority,
  className,
}: {
  size: number;
  priority?: boolean;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next-themes resolves theme only on the client; gate to avoid hydration mismatch.
  useEffect(() => setMounted(true), []);

  const src =
    mounted && resolvedTheme === "light"
      ? "/logo.jpeg"
      : "/logo_transparent.png";

  return (
    <Image
      src={src}
      alt="Aroha Astrology"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
