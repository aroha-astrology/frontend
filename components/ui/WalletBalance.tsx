import { Coins } from "lucide-react";
import { formatRupees } from "@/lib/format";

export default function WalletBalance({
  paise,
  size = "sm",
  className = "",
}: {
  paise: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const textSize = size === "md" ? "text-lg" : "text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-gold ${textSize} ${className}`}>
      <Coins size={size === "md" ? 16 : 15} />
      {formatRupees(paise)}
    </span>
  );
}
