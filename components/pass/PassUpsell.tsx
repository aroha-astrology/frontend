"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import { useNewFeature } from "@/hooks/useFeature";

/**
 * "Included in Aroha Pass · See the Pass" — shown next to a paid unlock that
 * the Pass covers. Renders nothing while the Pass (nav.arohaPass) is off.
 */
export default function PassUpsell({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("nav.arohaPass");
  if (!enabled) return null;
  return (
    <p className={`flex items-center justify-center gap-1 text-[11px] text-muted ${className}`} data-testid="pass-upsell">
      <Crown size={12} className="text-gold" />
      {t("pass.upsell")} ·{" "}
      <Link href="/pass" className="font-medium text-gold underline underline-offset-2">
        {t("pass.upsellLink")}
      </Link>
    </p>
  );
}
