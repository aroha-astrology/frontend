"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, Orbit } from "lucide-react";
import Card from "@/components/ui/Card";
import { useCircles } from "@/hooks/useCircles";
import { brightestMember } from "@/lib/circles";
import PulseDot from "@/components/circles/PulseDot";

/**
 * Home's Cosmic Circle card (circles.circles, ships off): the people the reader keeps close, each
 * with today's pulse, and a line about whoever's day looks brightest. Empty, it invites the reader
 * to add someone.
 */
export default function CirclesCard() {
  const { t } = useTranslation();
  const { enabled, circle } = useCircles();

  if (!enabled || !circle) return null;
  const bright = brightestMember(circle);
  const shown = circle.members.slice(0, 5);

  return (
    <Link href="/circles" className="block" data-testid="circles-card">
      <Card className="p-5 border-gold/15">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-2">
          <Orbit size={14} />
          {t("circles.homeTitle")}
        </p>
        {shown.length === 0 ? (
          <p className="text-sm text-foreground/85">{t("circles.homeEmpty")}</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-3">
              {shown.map((m) => (
                <li key={m.id} className="flex items-center gap-2" data-testid="circles-card-member">
                  <PulseDot tone={m.pulse?.tone ?? null} />
                  <span className="text-sm text-foreground">{m.name}</span>
                </li>
              ))}
            </ul>
            {bright && bright.pulse && bright.pulse.tone === "glow" && (
              <p className="mt-3 text-xs text-gold" data-testid="circles-card-bright">
                {t("circles.homeBright", { name: bright.name })}
              </p>
            )}
          </>
        )}
        <p className="mt-3 flex items-center justify-end gap-0.5 text-[11px] font-medium text-gold">
          {t("circles.open")}
          <ChevronRight size={12} />
        </p>
      </Card>
    </Link>
  );
}
