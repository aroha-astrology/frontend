"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { COLOR_CLASS } from "@/lib/hooks-copy";
import type { StripColor } from "@/lib/hooks-types";

/** A section card with a small heading. */
export function Section({ title, children, testId }: { title?: string; children: React.ReactNode; testId?: string }) {
  return (
    <Card className="p-5 border-gold/20" data-testid={testId}>
      {title && <p className="mb-2 text-gold text-xs font-medium uppercase tracking-wider">{title}</p>}
      {children}
    </Card>
  );
}

/** The gold pill button used for a hook's main action. */
export function Pill({
  children,
  onClick,
  disabled,
  tone = "gold",
  testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "gold" | "quiet";
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={
        tone === "gold"
          ? "h-11 rounded-full bg-gold/20 px-5 text-sm font-semibold text-gold disabled:opacity-50"
          : "h-10 rounded-full border border-gold/25 px-4 text-sm text-foreground disabled:opacity-50"
      }
    >
      {children}
    </button>
  );
}

/** A line of text that is an error or a confirmation after an action. */
export function Notice({ text, tone = "info" }: { text: string | null; tone?: "info" | "error" }) {
  if (!text) return null;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={tone === "error" ? "text-sm text-red-300" : "text-sm text-emerald-200"} data-testid="hook-notice">
      {text}
    </p>
  );
}

/**
 * Runs an action once at a time and keeps the last message. Pages use it as
 * `const { busy, msg, run } = useAction()` and `run(() => act(...))`.
 */
export function useAction(): {
  busy: boolean;
  msg: { text: string; tone: "info" | "error" } | null;
  run: (fn: () => Promise<{ ok: boolean; code: string | null }>, ok?: string, fail?: (code: string | null) => string) => Promise<boolean>;
} {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const run = async (fn: () => Promise<{ ok: boolean; code: string | null }>, ok?: string, fail?: (code: string | null) => string) => {
    if (busy) return false;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fn();
      if (res.ok) setMsg(ok ? { text: ok, tone: "info" } : null);
      else setMsg({ text: fail ? fail(res.code) : res.code ?? "Something went wrong.", tone: "error" });
      return res.ok;
    } finally {
      setBusy(false);
    }
  };
  return { busy, msg, run };
}

/** A horizontal strip of coloured segments sized by their length, with an optional "now" marker. */
export function ColorStrip({
  segments,
  startMin,
  spanMin = 1440,
  nowMin,
  testId,
}: {
  segments: { startMin: number; endMin: number; color: StripColor }[];
  startMin: number;
  spanMin?: number;
  nowMin?: number | null;
  testId?: string;
}) {
  return (
    <div className="relative h-8 w-full overflow-hidden rounded-full bg-black/20" role="img" aria-label="Day strip" data-testid={testId}>
      {segments.map((s) => (
        <span
          key={s.startMin}
          className={`absolute inset-y-0 ${COLOR_CLASS[s.color]}`}
          style={{ left: `${((s.startMin - startMin) / spanMin) * 100}%`, width: `${((s.endMin - s.startMin) / spanMin) * 100}%` }}
        />
      ))}
      {typeof nowMin === "number" && nowMin >= startMin && nowMin <= startMin + spanMin && (
        <span className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${((nowMin - startMin) / spanMin) * 100}%` }} data-testid="strip-now" />
      )}
    </div>
  );
}
