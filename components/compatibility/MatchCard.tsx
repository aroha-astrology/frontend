"use client";

import type { RiskSeverity } from "@/lib/reports-api";

interface MatchCardProps {
  hook: string;
  body: string;
  severity: RiskSeverity;
}

const SEVERITY_STYLE: Record<RiskSeverity, { border: string; bg: string; icon: string }> = {
  benefit: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", icon: "✨" },
  neutral: { border: "border-gold/20", bg: "bg-card", icon: "ℹ️" },
  caution: { border: "border-amber-500/30", bg: "bg-amber-500/5", icon: "⚠️" },
  serious: { border: "border-red-500/40", bg: "bg-red-500/5", icon: "⚠️" },
};

/** One hook-led card for a single life area — heading is the punchy hook, body is the
 * 200-500 character explanation. Styled by the deterministic severity, never by the AI. */
export default function MatchCard({ hook, body, severity }: MatchCardProps) {
  const style = SEVERITY_STYLE[severity];
  return (
    <div className={`rounded-2xl border p-4 ${style.border} ${style.bg}`}>
      <p className="text-sm font-semibold text-foreground leading-snug mb-1.5">
        <span className="mr-1.5">{style.icon}</span>
        {hook}
      </p>
      <p className="text-xs text-foreground/80 leading-relaxed">{body}</p>
    </div>
  );
}
