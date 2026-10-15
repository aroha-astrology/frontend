/**
 * The version to show people and to send with support tickets. In the
 * Android app that is the installed build ("1.16 (19)") from Capacitor, not
 * the web bundle's package.json version: the app loads the live site, so
 * NEXT_PUBLIC_APP_VERSION is the same on every phone whatever they installed.
 * On the web it is NEXT_PUBLIC_APP_VERSION.
 */
export const WEB_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

let native: Promise<string | null> | null = null;

/** The installed app's "version (build)", or null on the web. */
export function nativeAppVersion(): Promise<string | null> {
  if (!native) {
    native = (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return null;
        const { App } = await import("@capacitor/app");
        const { version, build } = await App.getInfo();
        return build && build !== version ? `${version} (${build})` : version;
      } catch {
        return null;
      }
    })();
  }
  return native;
}

export async function appVersion(): Promise<string> {
  return (await nativeAppVersion()) ?? WEB_APP_VERSION;
}
