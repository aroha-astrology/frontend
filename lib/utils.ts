import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names: clsx for conditional logic, tailwind-merge to resolve
 * conflicting Tailwind utilities so a passed `className` cleanly overrides defaults.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
