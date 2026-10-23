import { registerPlugin } from "@capacitor/core";
import { API_BASE_URL } from "./api";
import { isNativeAndroid } from "./play-billing";

/**
 * Tells the Android home-screen widget (build 1.17) which place to show. The widget fetches the
 * public GET /v1/widgets/live-now itself; this only hands it the place and the server address.
 *
 * Local native plugin registered in mobile/android's MainActivity (LiveNowWidgetPlugin), not an npm
 * package. A no-op in the browser and on a build without the widget.
 */
const LiveNowWidget = registerPlugin<{
  setPlace(opts: { apiBase: string; lat: number; lon: number; tz: string; place: string }): Promise<void>;
  clear(): Promise<void>;
}>("LiveNowWidget");

export async function shareWidgetPlace(place: { lat: number; lon: number; tz: string; name: string }): Promise<void> {
  try {
    if (!(await isNativeAndroid())) return;
    await LiveNowWidget.setPlace({
      apiBase: API_BASE_URL,
      lat: place.lat,
      lon: place.lon,
      tz: place.tz,
      place: place.name,
    });
  } catch {
    // an older build has no widget plugin; nothing to do
  }
}

export async function clearWidgetPlace(): Promise<void> {
  try {
    if (await isNativeAndroid()) await LiveNowWidget.clear();
  } catch {
    // nothing to clear
  }
}
