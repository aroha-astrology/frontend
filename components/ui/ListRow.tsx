"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListRowProps {
  icon: ReactNode;
  label: string;
  /** Optional secondary line under the label (e.g. "Available Languages: …"). */
  subtitle?: string;
  /**
   * Right-side slot. Defaults to a chevron when the row is interactive
   * (`href` or `onClick` set); pass a node (e.g. a `LanguagePicker` or
   * `Switch`) to override, or `null` to render nothing on the right.
   */
  right?: ReactNode;
  /** Renders the row as a `next/link` navigation row. */
  href?: string;
  /** Renders the row as a button; ignored if `href` is also set. */
  onClick?: () => void;
  /** "danger" applies the same red treatment used by destructive rows (e.g. Logout). */
  tone?: "default" | "danger";
  className?: string;
}

/**
 * Shared icon + label(+subtitle) + right-slot row primitive.
 *
 * Consolidates what used to be three near-identical implementations:
 * `SettingsRow`/`SettingsLink` (app/settings/page.tsx) and `DrawerLink`
 * (formerly in AppMenuDrawer.tsx). Covers all three shapes those had:
 *   - a static row with a custom right-side control (no `href`/`onClick`)
 *   - a navigation row (`href`, chevron by default)
 *   - an action row (`onClick`, chevron by default)
 */
export default function ListRow({ icon, label, subtitle, right, href, onClick, tone = "default", className }: ListRowProps) {
  const interactive = Boolean(href || onClick);
  const danger = tone === "danger";

  const content = (
    <>
      <span className={cn("shrink-0", danger ? "text-red-400" : "text-gold")}>{icon}</span>
      <span className="flex-1 min-w-0 text-left">
        <span className={cn("block text-sm truncate", danger ? "text-red-400 font-medium" : "text-foreground")}>
          {label}
        </span>
        {subtitle && <span className="block text-xs text-muted truncate mt-0.5">{subtitle}</span>}
      </span>
      {right !== undefined
        ? right
        : interactive && (
            <ChevronRight
              size={14}
              className={cn("shrink-0 transition-colors", danger ? "text-red-400/70" : "text-muted group-hover:text-gold")}
            />
          )}
    </>
  );

  const rowClass = cn(
    "flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors",
    danger ? "border-red-500/15 hover:bg-red-500/10" : "border-gold/15 bg-card",
    !danger && interactive && "hover:bg-gold/10 group",
    danger && "group bg-card",
    className,
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={rowClass}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(rowClass, "w-full")}>
        {content}
      </button>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
