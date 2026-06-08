import { cn } from "@/lib/utils";

interface LotusSilhouetteProps {
  className?: string;
  opacity?: number;
}

export default function LotusSilhouette({ className, opacity = 0.15 }: LotusSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={cn("pointer-events-none", className)}
      style={{ opacity }}
    >
      <path
        d="M50 90 C30 90 10 70 20 40 C30 10 50 10 50 10 C50 10 70 10 80 40 C90 70 70 90 50 90 Z"
      />
      <path d="M50 90 C40 70 25 50 25 30 C25 20 50 10 50 10" />
      <path d="M50 90 C60 70 75 50 75 30 C75 20 50 10 50 10" />
      <path d="M50 90 C45 75 35 60 35 45 C35 30 50 15 50 15" />
      <path d="M50 90 C55 75 65 60 65 45 C65 30 50 15 50 15" />
      <circle cx="50" cy="50" r="4" fill="currentColor" stroke="none" />
      <circle cx="50" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="35" cy="45" r="2" fill="currentColor" stroke="none" />
      <circle cx="65" cy="45" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
