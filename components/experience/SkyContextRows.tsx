"use client";

import { useState } from "react";
import { Home, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ListRow from "@/components/ui/ListRow";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import Switch from "@/components/ui/Switch";
import { useAuth } from "@/providers/auth-provider";
import { useSkyContext } from "@/hooks/useSkyContext";
import type { PlaceOfBirth } from "@/lib/api";

/**
 * Settings rows for the sky context: the home city (travel pill, switch experience.travelPill) and
 * "I live outside India" (NRI mode, switch experience.nriMode). Each shows only while its switch is on.
 */
export default function SkyContextRows() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { ctx, update } = useSkyContext();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<PlaceOfBirth | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ctx) return null;

  async function saveHome() {
    if (!picked) return;
    setBusy(true);
    await update({ homeLocation: picked });
    setBusy(false);
    setOpen(false);
    setPicked(null);
  }

  return (
    <>
      {ctx.travelPill && (
        <div data-testid="home-city-row">
          <ListRow
            icon={<Home size={16} />}
            label={t("travel.settings.homeCity")}
            subtitle={ctx.homeLocation?.name ?? t("travel.settings.homeCityHint")}
            onClick={() => setOpen(true)}
          />
        </div>
      )}
      {ctx.nriMode && (
        <div data-testid="nri-row">
          <ListRow
            icon={<Globe2 size={16} />}
            label={t("travel.settings.nri")}
            subtitle={t("travel.settings.nriHint")}
            right={
              <Switch
                checked={ctx.isNri}
                onChange={(next: boolean) => void update({ isNri: next })}
                aria-label={t("travel.settings.nri")}
              />
            }
          />
        </div>
      )}

      {open && (
        <BottomSheetModal
          onClose={() => !busy && setOpen(false)}
          closeLabel={t("common.close")}
          header={<h2 className="text-base font-semibold text-foreground">{t("travel.settings.homeCity")}</h2>}
        >
          <div className="space-y-4 p-1 pb-4">
            <p className="text-sm text-muted">{t("travel.settings.homeCityBody")}</p>
            <PlaceAutocomplete
              worldwide={!user?.phoneE164}
              placeholder={t("travel.settings.homeCityPlaceholder")}
              defaultQuery={ctx.homeLocation?.name}
              inputClassName="w-full bg-transparent py-3 px-4 text-[16px] text-foreground placeholder:text-muted/40 outline-none rounded-2xl border border-gold/20 bg-card/85 focus:border-gold/45 transition-colors"
              onSelect={setPicked}
            />
            <button
              type="button"
              data-testid="home-city-save"
              disabled={busy || !picked}
              onClick={saveHome}
              className="w-full rounded-2xl bg-gold py-3 text-sm font-medium text-black disabled:opacity-40"
            >
              {t("travel.settings.save")}
            </button>
          </div>
        </BottomSheetModal>
      )}
    </>
  );
}
