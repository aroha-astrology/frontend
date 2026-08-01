import { UserCircle } from "lucide-react";

function getInitials(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const SIZES = {
  sm: "w-10 h-10 text-sm",
  md: "w-11 h-11 text-base",
} as const;

/** Google/GA-style initials circle, derived from a display name. Falls back to a generic icon when there's no name. */
export default function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initials = getInitials(name);
  return (
    <div
      className={`${SIZES[size]} rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-gold font-semibold shrink-0 ${className}`}
    >
      {initials ?? <UserCircle size={size === "sm" ? 22 : 26} />}
    </div>
  );
}
