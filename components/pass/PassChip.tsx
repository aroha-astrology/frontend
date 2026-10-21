"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import { usePassStatus } from "@/hooks/usePassStatus";

/**
 * The top bar's Aroha Pass chip. A member sees their tier (Silver, Gold or
 * Platinum) and it opens /pass, where a higher Pass is offered. Everyone else
 * sees a quieter "Get Pass" while a Pass is on sale. Nothing while the Pass is
 * off, still loading, or has no tier to sell.
 */
export default function PassChip() {
  const { t } = useTranslation();
  const status = usePassStatus();
  if (!status) return null;

  const { pass, offers } = status;
  if (pass) {
    return (
      <Link
        href="/pass"
        data-testid="pass-chip"
        data-tier={pass.tier ?? "member"}
        aria-label={pass.tier ? t(`pass.tier.${pass.tier}`) : t("pass.title")}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 text-sm font-bold text-black"
      >
        <Crown size={15} />
        {pass.tier ? t(`pass.tierShort.${pass.tier}`) : t("pass.badge")}
      </Link>
    );
  }
  if (offers.length === 0) return null;
  return (
    <Link
      href="/pass"
      data-testid="pass-chip"
      data-tier="none"
      className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-gold/40 px-3 text-xs font-semibold text-gold"
    >
      <Crown size={14} />
      {t("pass.chip.get")}
    </Link>
  );
}
