/**
 * How money is written in the app: rupees (the default) or Aroha Coins.
 *
 * 1 coin = ₹1 = 100 paise, so nothing about amounts changes, only how they are written. The mode
 * follows the `money.coins` switch (see `moneyModeFor`) and is set the moment a session loads
 * (providers/auth-provider.tsx), before the screens that show an amount render. Every wallet amount
 * the app shows goes through `formatRupees` (lib/format.ts), which reads it. Translated copy is NOT
 * rewritten wholesale: a few strings contain a rupee sign that is not wallet money (the income
 * brackets "₹1L – ₹5L", the payment button), so the few fixed rupee strings that are wallet money
 * go through `coinify` one by one.
 *
 * Real money (₹, $, €, £) appears only where a payment is made, via `formatFiat`. That is the one
 * place that must NOT follow this mode.
 */

export type MoneyMode = "rupees" | "coins";

export const COIN_SYMBOL = "🪙";

let mode: MoneyMode = "rupees";

export function setMoneyMode(next: MoneyMode): void {
  mode = next;
}

export function getMoneyMode(): MoneyMode {
  return mode;
}

/** The mode a session's resolved features ask for: coins only when `money.coins` is switched on. */
export function moneyModeFor(
  features: Record<string, { enabled: boolean } | undefined> | null | undefined,
): MoneyMode {
  return features?.["money.coins"]?.enabled === true ? "coins" : "rupees";
}

/** A coin amount: "🪙 20", "🪙 1,800". An amount that is not a whole coin keeps its two decimals. */
export function formatCoins(paise: number | null | undefined): string {
  const coins = (paise ?? 0) / 100;
  if (!Number.isFinite(coins)) return `${COIN_SYMBOL} 0`;
  const text = Number.isInteger(coins)
    ? coins.toLocaleString("en-US")
    : coins.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${COIN_SYMBOL} ${text}`;
}

/** Rewrites "₹20" / "₹1,500" in one piece of wallet copy as "🪙 20" / "🪙 1,500" while the app is in coins mode. */
export function coinify(text: string): string {
  if (mode !== "coins") return text;
  return text.replace(/₹\s?(\d[\d,]*(?:\.\d+)?)/g, `${COIN_SYMBOL} $1`);
}

const FIAT_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

/**
 * Real money in the minor unit of its currency (paise, cents, pence): "₹99", "$4.99", "€9.99".
 * Used on the payment sheet and nowhere else; unaffected by the coins mode.
 */
export function formatFiat(minor: number, currency: string): string {
  const symbol = FIAT_SYMBOLS[currency] ?? `${currency} `;
  const major = minor / 100;
  return `${symbol}${currency === "INR" ? major.toFixed(0) : major.toFixed(2)}`;
}
