"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import PermissionSheet, { type SheetView } from "@/components/ui/PermissionSheet";
import { canOpenAppSettings, canOpenNotificationSettings, openAppSettings, openNotificationSettings } from "@/lib/app-settings";
import { checkPermission, requestPermission, type PermissionKind } from "@/lib/permissions";

interface PermissionContextValue {
  /**
   * Makes sure `kind` is usable before a screen needs it. Resolves true when it
   * is (already, or after the reader allowed it in the sheet) and false when the
   * reader backed out or the device cannot do it. Where the browser cannot tell,
   * it resolves true and lets the screen try, as it did before this helper.
   * Never throws.
   */
  ensurePermission: (kind: PermissionKind) => Promise<boolean>;
}

const PermissionContext = createContext<PermissionContextValue>({ ensurePermission: async () => true });

export const usePermission = () => useContext(PermissionContext);

interface Open {
  kind: PermissionKind;
  view: SheetView;
}

/**
 * One in-app sheet for every "the app needs your microphone / camera / location
 * / notifications" moment. States: why (ask first) -> the system dialog ->
 * denied (try again) or blocked (the phone will not ask again: open settings, or
 * follow the written path) or no-device. On returning to the app the permission
 * is checked again and the original action continues without another tap.
 */
export function PermissionProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Open | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);
  const openRef = useRef<Open | null>(null);
  openRef.current = open;

  const finish = useCallback((ok: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOpen(null);
    resolve?.(ok);
  }, []);

  const ensurePermission = useCallback(async (kind: PermissionKind) => {
    const state = await checkPermission(kind);
    if (state === "granted" || state === "unsupported") return true;
    // One sheet at a time: a second ask while one is open just says no.
    if (resolveRef.current) return false;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOpen({ kind, view: "why" });
    });
  }, []);

  const allow = useCallback(async () => {
    const current = openRef.current;
    if (!current) return;
    const outcome = await requestPermission(current.kind);
    if (outcome === "granted" || outcome === "unsupported") return finish(true);
    setOpen({ kind: current.kind, view: outcome });
  }, [finish]);

  // Whether the "Open settings" button can be offered (new Android builds only).
  useEffect(() => {
    if (open?.view !== "blocked") return;
    const check = open.kind === "notifications" ? canOpenNotificationSettings : canOpenAppSettings;
    void check().then(setCanOpenSettings);
  }, [open]);

  // Back from the phone's settings (or any time the app comes to the front while
  // the sheet is up): look again, and carry on if it is allowed now.
  useEffect(() => {
    if (!open) return;
    const recheck = async () => {
      const current = openRef.current;
      if (!current || document.visibilityState === "hidden") return;
      if ((await checkPermission(current.kind)) === "granted") finish(true);
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [open, finish]);

  const value = useMemo(() => ({ ensurePermission }), [ensurePermission]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
      {open && (
        <PermissionSheet
          kind={open.kind}
          view={open.view}
          onAllow={() => void allow()}
          onClose={() => finish(false)}
          onOpenSettings={
            canOpenSettings
              ? () => void (open.kind === "notifications" ? openNotificationSettings() : openAppSettings())
              : undefined
          }
          t={t}
        />
      )}
    </PermissionContext.Provider>
  );
}
