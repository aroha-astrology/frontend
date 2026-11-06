import type { TFunction } from "i18next";

/** A zodiac sign in the reader's language, from the app's own translated names (zodiac.signs.*). */
export function signName(t: TFunction, sign: string): string {
  return t(`zodiac.signs.${sign.toLowerCase()}`, { defaultValue: sign });
}
