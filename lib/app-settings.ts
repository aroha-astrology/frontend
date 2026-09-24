import { registerPlugin } from "@capacitor/core";

/**
 * Local native plugin (mobile/android AppSettingsPlugin.java) — opens this
 * app's notification settings page. Only in Android builds from 1.12 on; older
 * installs don't have it, so always check canOpenNotificationSettings() first.
 */
const AppSettings = registerPlugin<{ openNotificationSettings(): Promise<void> }>("AppSettings");

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
