import type { PracticeItem } from "@/lib/practice-api";
import { weekdayName } from "@/lib/why-format";

type Translate = (key: string, vars?: Record<string, unknown>) => string;

/** An item's heading: "Today's mantra", "For your Saturn period", "Thursday's prayer", … */
export function practiceItemTitle(t: Translate, item: PracticeItem, lang: string): string {
  switch (item.id) {
    case "remedy":
      return t("practice.items.remedy");
    case "dasha": {
      const planet = item.why[0]?.planet;
      return t("practice.items.dasha", { planet: planet ? t(`planetNames.${planet.toLowerCase()}`) : "" });
    }
    case "weekday": {
      const why = item.why[0];
      if (why?.textKey === "practice.why.gayatri") return t("practice.items.gayatri");
      return t("practice.items.weekday", { weekday: weekdayName(Number(why?.params?.weekday ?? 0), lang) });
    }
    case "lalKitab":
      return t("practice.items.lalKitab");
  }
}

/** The translated Lal Kitab lines for a lalKitab item. */
export function lalKitabLines(t: Translate, item: PracticeItem): string[] {
  if (!item.lalKitab) return [];
  return item.lalKitab.lines.map((i) => t(`practice.lalKitabLines.h${item.lalKitab!.house}.${i}`));
}
