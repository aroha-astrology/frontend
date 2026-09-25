import { registerPlugin } from "@capacitor/core";

export interface PlayBillingPurchase {
  productId: string;
  purchaseToken: string;
  orderId: string;
  /** Subscriptions only: the server acknowledges them (never consumed). */
  acknowledged?: boolean;
}

interface PlayBillingPluginInterface {
  /** `userId` (optional) is set as Play Billing's `obfuscatedAccountId` — it's what lets the
   * server-side RTDN webhook identify who a purchase belongs to when the app never confirms it. */
  purchaseProduct(options: {
    productId: string;
    userId?: string;
    /** "subs" buys a subscription (the Aroha Pass) on `basePlanId`; default is a one-time top-up. */
    productType?: "inapp" | "subs";
    basePlanId?: string;
  }): Promise<PlayBillingPurchase>;
  queryUnconsumedPurchases(): Promise<{ purchases: PlayBillingPurchase[] }>;
  /** Needs the app release that added subscriptions (1.13+); older builds reject. */
  queryActiveSubscriptions(): Promise<{ purchases: PlayBillingPurchase[] }>;
}

/**
 * Local native plugin registered in mobile/android's MainActivity — not an
 * npm package. Only usable when Capacitor.isNativePlatform() is true.
 */
export const PlayBilling = registerPlugin<PlayBillingPluginInterface>("PlayBilling");

/** True only inside the native Android build — the one place Play Billing can run. */
export async function isNativeAndroid(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false; // @capacitor/core not resolvable — plain web build.
  }
}

/** True only inside the native iOS build — no in-app top-up exists there yet. */
export async function isNativeIOS(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}
