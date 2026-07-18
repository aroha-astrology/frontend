import { formatRupees } from "@/lib/format";

export default function WalletBalance({
  paise,
  size = "sm",
  className = "",
}: {
  paise: number | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const textSize = size === "md" ? "text-lg" : "text-sm";
  return (
    <span className={`inline-flex items-center font-semibold text-gold ${textSize} ${className}`}>
      {formatRupees(paise)}
    </span>
  );
}
