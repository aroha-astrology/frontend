import { registerPlugin } from "@capacitor/core";

/**
 * Keeps a voice call alive while the Android app is minimized.
 *
 * Android silences the microphone of an app that is not on screen, however
 * alive its WebView is, unless the app runs a foreground service of type
 * "microphone" (and shows its notification). So a call that carries on in the
 * background needs that service, and it can only be started by native code:
 * `VoiceCallServicePlugin` in the mobile repo's Android app, from build 19
 * (versionName 1.16) on. Older installs do not have it, and a browser never
 * does; there the call simply behaves as it always did, and the 10-second
 * silence hang-up (see gemini-live-client.ts) ends a call whose microphone the
 * phone has gone quiet on.
 *
 * Nothing here ever throws: a call must not fail to start because a
 * notification could not be shown.
 */
interface VoiceCallServicePlugin {
  /** Starts the foreground service. Must be called while the app is on screen and the mic is already allowed. */
  start(options: { title: string; text: string }): Promise<void>;
  stop(): Promise<void>;
}

const VoiceCallService = registerPlugin<VoiceCallServicePlugin>("VoiceCallService");

async function available(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("VoiceCallService");
  } catch {
    return false;
  }
}

/** Resolves whether the call is now protected from the phone silencing its mic in the background. */
export async function startBackgroundCall(title: string, text: string): Promise<boolean> {
  if (!(await available())) return false;
  try {
    await VoiceCallService.start({ title, text });
    return true;
  } catch (err) {
    console.warn("voice: background service did not start", err);
    return false;
  }
}

export async function stopBackgroundCall(): Promise<void> {
  if (!(await available())) return;
  try {
    await VoiceCallService.stop();
  } catch {
    // Already stopped, or never started.
  }
}
