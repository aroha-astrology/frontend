import { registerPlugin } from "@capacitor/core";

/**
 * Local native plugin (mobile/android AppSettingsPlugin.java) — opens this
 * app's notification settings page. Only in Android builds from 1.12 on; older
 * installs don't have it, so always check canOpenNotificationSettings() first.
 */
const AppSettings = registerPlugin<{ openNotificationSettings(): Promise<void>; openAppSettings(): Promise<void> }>(
  "AppSettings",
);

/** Android versionCode of the first build with openAppSettings (the build after 1.18 / 21). */
export const APP_SETTINGS_MIN_BUILD = 22;

/**
 * True on an Android build that can open the app's own settings page, where the
 * microphone, camera and location are switched (builds before that only have the
 * notification page). The plugin object exists on every build from 1.12 but a
 * method added later does not, and the bridge cannot list its methods, so the
 * build number decides.
 */
export async function canOpenAppSettings(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.getPlatform() !== "android" || !Capacitor.isPluginAvailable("AppSettings")) return false;
    const { App } = await import("@capacitor/app");
    return Number((await App.getInfo()).build) >= APP_SETTINGS_MIN_BUILD;
  } catch {
    return false;
  }
}

/** Opens this app's page in the phone's settings. Resolves false if it could not. */
export async function openAppSettings(): Promise<boolean> {
  try {
    await AppSettings.openAppSettings();
    return true;
  } catch {
    return false;
  }
}

export async function canOpenNotificationSettings(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("AppSettings");
  } catch {
    return false;
  }
}

/** Resolves false if the screen couldn't be opened (old build, OEM without it). */
export async function openNotificationSettings(): Promise<boolean> {
  try {
    await AppSettings.openNotificationSettings();
    return true;
  } catch {
    return false;
  }
}
