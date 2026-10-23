"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useNewFeature, resolveFeature } from "@/hooks/useFeature";
import { isPillActive, pillGroupFor, visiblePills } from "@/lib/nav-pills";
import { useAuth } from "@/providers/auth-provider";

/**
 * The row of related pages under the top bar (switch nav.pills). Every pill links to a page that
 * already exists; the row only appears on those pages.
 */
export default function SubTabPills() {
  const { t } = useTranslation();
  const pathname = usePathname() ?? "";
  const { user } = useAuth();
  const { enabled } = useNewFeature("nav.pills");
  const group = enabled ? pillGroupFor(pathname) : null;
  if (!group) return null;

  const pills = visiblePills(
    group,
    (p) => resolveFeature(user?.features, p.featureKey!, { failClosed: p.isNew }).enabled,
  );
  if (pills.length === 0) return null;

  return (
    <nav aria-label={t("menu.title")} data-testid="sub-tab-pills" className="page-container flex gap-2 overflow-x-auto pb-2">
      {pills.map((p) => {
        const active = isPillActive(p, pathname);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={active ? "page" : undefined}
            data-testid={`pill-${p.href === "/" ? "home" : p.href.slice(1).replace(/\//g, "-")}`}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-gold text-black" : "border border-gold/25 bg-gold/5 text-gold/80"
            }`}
          >
            {t(p.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
