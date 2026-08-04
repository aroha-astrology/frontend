import { registerPlugin } from "@capacitor/core";

export interface PlayBillingPurchase {
  productId: string;
  purchaseToken: string;
  orderId: string;
}

interface PlayBillingPluginInterface {
  purchaseProduct(options: { productId: string }): Promise<PlayBillingPurchase>;
  queryUnconsumedPurchases(): Promise<{ purchases: PlayBillingPurchase[] }>;
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

/** True only inside the native iOS build — Apple's IAP rules block Razorpay there. */
export async function isNativeIOS(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}
