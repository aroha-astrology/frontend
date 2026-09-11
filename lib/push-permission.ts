import { api } from "@/lib/api";
import { getDeviceId, markPushRefreshed } from "@/lib/device-id";

/**
 * What the OS told us, reduced to the only distinction callers care about.
 *
 * "inconclusive" deliberately covers BOTH a soft OS answer
 * ("prompt"/"prompt-with-rationale") and any technical failure along the way —
 * plugins not resolvable, getToken() throwing, the register call failing. None
 * of those is a decision by the user, so no caller should record them as one;
 * a fresh attempt next launch is the correct behaviour.
 */
export type PushPermissionOutcome = "granted" | "denied" | "inconclusive";

/**
 * Ask for notification permission and, on a grant, register the resulting FCM
 * token with the backend.
 *
 * Shared by the launch prompt (PermissionsPrompt) and the rewards card
 * (PermissionRewards) so the ordering rule below lives in exactly one place:
 * this MUST run to completion before anything touches geolocation. Android
 * allows only one requestPermissions() in flight per Activity, so firing the
 * WebView's location dialog concurrently makes Android silently reject the
 * second call ("Can request only one set of permissions at a time") — the
 * notification dialog then never appears and the request resolves to "prompt"
 * instead of a real answer.
 *
 * Registering the token is also what earns the ₹25 notification reward: the
 * backend grants it on a successful POST /v1/device-tokens, because a token
 * cannot be issued without the OS grant and is therefore proof of it.
 */
export async function requestPushPermission(userId: string): Promise<PushPermissionOutcome> {
  let Capacitor: typeof import("@capacitor/core").Capacitor;
  let FirebaseMessaging: typeof import("@capacitor-firebase/messaging").FirebaseMessaging;
  try {
    ({ Capacitor } = await import("@capacitor/core"));
    ({ FirebaseMessaging } = await import("@capacitor-firebase/messaging"));
  } catch (err) {
    console.error("[push-permission] plugin import failed", err);
    return "inconclusive";
  }

  const platform = Capacitor.getPlatform();

  let perm;
  try {
    perm = await FirebaseMessaging.requestPermissions();
    console.log("[push-permission] requestPermissions ->", perm.receive);
  } catch (err) {
    console.error("[push-permission] requestPermissions() threw", err);
    return "inconclusive";
  }

  // An explicit OS-level decline is a real, permanent decision — respect it and
  // don't re-request via the native dialog.
  if (perm.receive === "denied") return "denied";
  if (perm.receive !== "granted") return "inconclusive";

  try {
    const { token } = await FirebaseMessaging.getToken();
    console.log("[push-permission] getToken ->", token ? `${token.slice(0, 12)}...` : "(empty)");
    if (!token || (platform !== "android" && platform !== "ios")) return "inconclusive";

    // pushEnabled:true is the OS state we just observed. It had always been sent
    // as null, which is why the backend could not tell a revoked device from an
    // unknown one until FCM bounced the token.
    await api.registerDeviceToken({ token, platform, deviceId: getDeviceId(), pushEnabled: true });
    console.log("[push-permission] registerDeviceToken -> ok");
    markPushRefreshed(userId); // Just registered — don't let the next launch re-fetch the token.
    return "granted";
  } catch (err) {
    console.error("[push-permission] getToken/registerDeviceToken failed", err);
    return "inconclusive";
  }
}
