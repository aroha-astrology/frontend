import { registerPlugin } from "@capacitor/core";

/** What StoreKit 2 hands back for one purchase: Apple's signed transaction (a JWS the server checks). */
export interface AppStorePurchase {
  productId: string;
  /** StoreKit 2 `jwsRepresentation` of the verified transaction. */
  signedTransaction: string;
  /** "pending" = Ask to Buy or a slow payment that Apple hasn't confirmed yet; nothing to grant. */
  state?: "purchased" | "pending";
}

/** What the App Store charges for one product, in the user's own currency. */
export interface AppStorePrice {
  productId: string;
  displayPrice: string;
}

interface AppStorePluginInterface {
  /**
   * Buys `productId`. `appAccountToken` must be the user's id (a UUID): Apple echoes it in the signed
   * transaction and in the server notifications, which is how the server knows whose purchase it is.
   * Rejects with `code: "cancelled"` when the user backs out.
   */
  purchase(options: { productId: string; appAccountToken: string }): Promise<AppStorePurchase>;
  /** The newest signed transaction of every subscription this Apple ID holds now (Restore). */
  currentSubscriptions(): Promise<{ purchases: AppStorePurchase[] }>;
  /** Signed transactions of purchases that were paid but not yet finished (a killed app). */
  unfinished(): Promise<{ purchases: AppStorePurchase[] }>;
  /** Tells StoreKit the server has recorded the purchase, so it stops offering it again. */
  finish(options: { productId: string; signedTransaction: string }): Promise<void>;
  prices(options: { productIds: string[] }): Promise<{ prices: AppStorePrice[] }>;
}

/**
 * Local native plugin in mobile/ios (AppStorePlugin.swift), not an npm package. Only usable inside
 * the iOS app, and only once that build has in-app purchases set up in App Store Connect.
 */
export const AppStore = registerPlugin<AppStorePluginInterface>("AppStore");

/** The user rejected the purchase sheet: not an error. */
export function isAppStoreCancelled(err: unknown): boolean {
  return err !== null && typeof err === "object" && "code" in err && (err as { code?: string }).code === "cancelled";
}
