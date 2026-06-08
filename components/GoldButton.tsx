"use client";

import { clsx } from "clsx";

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "solid" | "outline";
  fullWidth?: boolean;
}

export default function GoldButton({
  children,
  variant = "solid",
  fullWidth = false,
  className,
  ...props
}: GoldButtonProps) {
  return (
    <button
      className={clsx(
        "relative overflow-hidden h-14 px-6 rounded-full font-bold font-body transition-opacity active:opacity-80",
        variant === "solid"
          ? "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-lg"
          : "border border-gold text-gold bg-transparent",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {variant === "solid" && (
        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
