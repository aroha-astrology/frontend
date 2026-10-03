import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { api } from "@/lib/api";
import { getDeviceId, markPushRefreshed } from "@/lib/device-id";
import { emitForegroundPush } from "@/lib/push-events";
import { getFirebaseApp, firebaseWebConfig } from "@/lib/firebase";
import type { PushPermissionOutcome } from "@/lib/push-permission";

/**
 * Browser push, for people using app.arohaastrology.in outside the Android app.
 * Everything here is skipped inside the Capacitor shell (lib/push-permission.ts
 * and PushNotificationListener route native builds to the Capacitor plugin).
 *
 * Needs two build-time vars from the same Firebase project the backend sends
 * from: NEXT_PUBLIC_FIREBASE_VAPID_KEY and NEXT_PUBLIC_FIREBASE_AUTH_MESSAGING_SENDER_ID.
 * Without them every call here reports "unsupported", so the UI simply hides.
 */

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const SW_SCOPE = "/firebase-cloud-messaging-push-scope";

export type WebPushState =
  | "unsupported" // no browser support, or this deployment has no push keys
  | "needs-install" // iPhone/iPad Safari only allows push for a Home Screen app
  | "default" // not asked yet
  | "granted"
  | "denied"; // blocked in browser settings; the dialog will not show again

export function isWebPushConfigured(): boolean {
  return Boolean(VAPID_KEY && firebaseWebConfig.messagingSenderId);
}

function isIosBrowserTab(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/i.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  const standalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return !standalone;
}

export async function getWebPushState(): Promise<WebPushState> {
  if (typeof window === "undefined" || !isWebPushConfigured()) return "unsupported";
  if (isIosBrowserTab()) return "needs-install";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  try {
    if (!(await isSupported())) return "unsupported";
  } catch {
    return "unsupported";
  }
  return Notification.permission === "default"
    ? "default"
    : Notification.permission === "granted"
      ? "granted"
      : "denied";
}

function serviceWorkerUrl(): string {
  const q = new URLSearchParams({
    apiKey: firebaseWebConfig.apiKey ?? "",
    projectId: firebaseWebConfig.projectId ?? "",
    appId: firebaseWebConfig.appId ?? "",
    messagingSenderId: firebaseWebConfig.messagingSenderId ?? "",
  });
  return `/firebase-messaging-sw.js?${q.toString()}`;
}

async function registerWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(serviceWorkerUrl(), { scope: SW_SCOPE });
  await navigator.serviceWorker.ready;
  return registration;
}

/** Gets this browser's FCM token and registers it for the user. Assumes permission is already granted. */
export async function registerWebPushToken(userId: string): Promise<boolean> {
  const registration = await registerWorker();
  const token = await getToken(getMessaging(getFirebaseApp()), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return false;
  await api.registerDeviceToken({
    token,
    platform: "web",
    deviceId: getDeviceId(),
    locale: navigator.language,
    pushEnabled: true,
  });
  markPushRefreshed(userId);
  listenForForegroundWebPush();
  return true;
}

/**
 * Asks the browser for notification permission and, on a grant, registers the
 * token. Same outcome contract as the native requestPushPermission: only a real
 * grant or a real block counts as a decision; anything else is "inconclusive".
 */
export async function requestWebPushPermission(userId: string): Promise<PushPermissionOutcome> {
  const state = await getWebPushState();
  if (state === "denied") return "denied";
  if (state === "unsupported" || state === "needs-install") return "inconclusive";

  try {
    if (state === "default") {
      const result = await Notification.requestPermission();
      if (result === "denied") return "denied";
      if (result !== "granted") return "inconclusive";
    }
    return (await registerWebPushToken(userId)) ? "granted" : "inconclusive";
  } catch (err) {
    console.error("[web-push] enabling push failed", err);
    return "inconclusive";
  }
}

let foregroundListening = false;

/**
 * Shows pushes that arrive while the tab is open through the same in-app banner
 * the Android app uses. Browsers show nothing themselves for a focused tab.
 * Idempotent: one subscription for the life of the page.
 */
export function listenForForegroundWebPush(): void {
  if (foregroundListening) return;
  try {
    onMessage(getMessaging(getFirebaseApp()), (payload) => {
      const title = payload.notification?.title ?? "";
      const body = payload.notification?.body ?? "";
      if (!title && !body) return;
      emitForegroundPush({ title, body, navigate: payload.data?.navigate, type: payload.data?.type });
    });
    foregroundListening = true;
  } catch {
    // Messaging unavailable; background pushes still arrive.
  }
}
