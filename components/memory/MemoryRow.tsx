"use client";

import { BookHeart } from "lucide-react";
import { useTranslation } from "react-i18next";
import ListRow from "@/components/ui/ListRow";
import { useNewFeature } from "@/hooks/useFeature";

/** Settings → "What your guide remembers" (switch memory.vault): opens the Memory Vault. Hidden while the switch is off. */
export default function MemoryRow() {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("memory.vault");
  if (!enabled) return null;
  return (
    <div data-testid="memory-row">
      <ListRow icon={<BookHeart size={16} />} label={t("memory.row")} subtitle={t("memory.rowSub")} href="/memory" />
    </div>
  );
}
