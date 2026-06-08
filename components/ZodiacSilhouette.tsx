"use client";

import { clsx } from "clsx";

interface ZodiacSilhouetteProps {
  src: string;
  className?: string;
}

export default function ZodiacSilhouette({ src, className }: ZodiacSilhouetteProps) {
  return (
    <div 
      className={clsx("bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        maskImage: `url(${src})`,
        maskSize: "contain",
        maskPosition: "center",
        maskRepeat: "no-repeat",
      }}
    />
  );
}
