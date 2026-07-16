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
