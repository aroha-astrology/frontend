import { cn } from "@/lib/utils";

/**
 * A gold rupee coin for the daily-reward ladder — replaces the earlier moon-phase
 * icons, which read as decorative rather than "this is money." Built inline (no
 * raster asset) so it stays crisp at any size and needs no new file.
 */
export default function RewardCoin({
  bright,
  size = 40,
}: {
  /** Claimed, or today's still-claimable slot — full gold and legible. Muted otherwise. */
  bright: boolean;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center border-2 font-display font-bold shrink-0",
        bright
          ? "border-yellow-200 bg-gradient-to-br from-yellow-200 via-gold to-yellow-700 text-black shadow-[0_0_10px_rgba(212,175,55,0.55)]"
          : "border-gold/25 bg-gold/5 text-gold/35",
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      ₹
    </div>
  );
}
