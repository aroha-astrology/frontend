/**
 * Tithi and nakshatra names in the reader's own language (switch lang.localNames). The engine names
 * them in English ("Purva Phalguni", "Shukla"); the strings are filed under the lowercased letters only
 * ("purvaphalguni") in tithiNames / nakshatraNames / nowBar.paksha, in all 15 languages.
 */

/** The key a name is filed under: letters only, lowercased. */
export function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

type Translate = (key: string, opts?: { defaultValue?: string }) => string;

export interface PanchangNamer {
  tithi: (name: string) => string;
  nakshatra: (name: string) => string;
  paksha: (name: string) => string;
}

/** With `on` false every name is returned as the engine wrote it, exactly as the app always showed it. */
export function makeNamer(t: Translate, on: boolean): PanchangNamer {
  const pick = (ns: string, name: string) => (on && name ? t(`${ns}.${nameKey(name)}`, { defaultValue: name }) : name);
  return {
    tithi: (name) => pick("tithiNames", name),
    nakshatra: (name) => pick("nakshatraNames", name),
    paksha: (name) => pick("nowBar.paksha", name),
  };
}
