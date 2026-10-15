"use client";

import { useEffect, useState } from "react";
import { WEB_APP_VERSION, nativeAppVersion } from "@/lib/app-version";

/** The version to show: the installed build in the app, the web version otherwise (lib/app-version.ts). */
export function useAppVersion(): string {
  const [version, setVersion] = useState(WEB_APP_VERSION);
  useEffect(() => {
    let live = true;
    nativeAppVersion().then((v) => {
      if (live && v) setVersion(v);
    });
    return () => {
      live = false;
    };
  }, []);
  return version;
}
