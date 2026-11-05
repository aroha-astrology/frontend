"use client";

import type { TFunction } from "i18next";
import { Camera, Bell, MapPin, Mic } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import type { PermissionKind } from "@/lib/permissions";

/** Which screen of the sheet: the ask, a refusal that can be retried, a refusal the phone will not repeat, or no device. */
export type SheetView = "why" | "denied" | "blocked" | "no-device";

const ICON = { microphone: Mic, camera: Camera, location: MapPin, notifications: Bell } as const;

export default function PermissionSheet({
  kind,
  view,
  onAllow,
  onClose,
  onOpenSettings,
  t,
}: {
  kind: PermissionKind;
  view: SheetView;
  onAllow: () => void;
  onClose: () => void;
  /** Present only where the app can open the phone's settings page itself. */
  onOpenSettings?: () => void;
  t: TFunction;
}) {
  const Icon = ICON[kind];
  const primary = "w-full rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-[#1a0e00]";
  const secondary = "w-full rounded-2xl border px-5 py-3 text-sm font-semibold text-muted";

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("permissionSheet.close")}
      layerClass="z-[300]"
      header={
        <h2 className="flex items-center gap-2 text-base font-semibold text-gold">
          <Icon size={18} />
          {t(`permissionSheet.title.${kind}`)}
        </h2>
      }
    >
      <div data-testid="permission-sheet" className="space-y-4 px-1 pb-2">
        {view === "why" && <p className="text-sm leading-relaxed text-muted">{t(`permissionSheet.why.${kind}`)}</p>}
        {view === "denied" && <p className="text-sm leading-relaxed text-muted">{t("permissionSheet.deniedBody")}</p>}
        {view === "blocked" && (
          <>
            <p className="text-sm leading-relaxed text-muted">{t("permissionSheet.blockedBody")}</p>
            <p className="text-sm font-semibold leading-relaxed text-gold">
              {t("permissionSheet.settingsPath", { name: t(`permissionSheet.name.${kind}`) })}
            </p>
          </>
        )}
        {view === "no-device" && (
          <p className="text-sm leading-relaxed text-muted">
            {t(`permissionSheet.noDevice.${kind === "camera" ? "camera" : "microphone"}`)}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {view === "why" && (
            <button type="button" className={primary} onClick={onAllow}>
              {t("permissionSheet.allow")}
            </button>
          )}
          {view === "denied" && (
            <button type="button" className={primary} onClick={onAllow}>
              {t("permissionSheet.tryAgain")}
            </button>
          )}
          {view === "blocked" && onOpenSettings && (
            <button type="button" className={primary} onClick={onOpenSettings}>
              {t("permissionSheet.openSettings")}
            </button>
          )}
          <button type="button" className={secondary} style={{ borderColor: "var(--border)" }} onClick={onClose}>
            {view === "why" ? t("permissionSheet.notNow") : t("permissionSheet.close")}
          </button>
        </div>
      </div>
    </BottomSheetModal>
  );
}
