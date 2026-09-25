"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import { useNewFeature } from "@/hooks/useFeature";
import { passApi } from "@/lib/pass-api";

/** A small "Pass" chip linking to /pass, shown while the user's Aroha Pass is active. */
export default function PassBadge() {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("nav.arohaPass");
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    passApi
      .status()
      .then((s) => setActive(Boolean(s.pass)))
      .catch(() => setActive(false));
  }, [enabled]);

  if (!enabled || !active) return null;
  return (
    <Link
      href="/pass"
      data-testid="pass-badge"
      className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold"
    >
      <Crown size={11} />
      {t("pass.badge")}
    </Link>
  );
}
