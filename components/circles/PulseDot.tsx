import type { PulseTone } from "@/lib/circles";

const TONE_CLASS: Record<PulseTone, string> = {
  glow: "bg-gold shadow-[0_0_8px] shadow-gold/60",
  steady: "bg-emerald-400",
  quiet: "bg-sky-300",
  care: "bg-rose-300",
};

/** A small dot coloured by a member's pulse tone; grey while the pulse cannot be read yet. */
export default function PulseDot({ tone }: { tone: PulseTone | null }) {
  return (
    <span
      aria-hidden
      data-tone={tone ?? "none"}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${tone ? TONE_CLASS[tone] : "bg-white/20"}`}
    />
  );
}
