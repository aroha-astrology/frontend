// Small defensive readers for the loosely-typed `chart` blob returned by the
// backend (`Record<string, unknown>` — the shape varies slightly by source),
// shared so every caller stays in sync on where a given fact might live.

import type { Kundli } from "./api";

export function readString(obj: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === "string" ? v : undefined;
}

export function readNested(obj: Record<string, unknown> | null | undefined, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

/** The user's natal Moon sign, or undefined if the kundli isn't ready / doesn't have one. */
export function getUserMoonSign(kundli: Kundli | null): string | undefined {
  if (!kundli?.chart) return undefined;
  return readString(kundli.chart, "moonSign") ?? readNested(kundli.chart, ["moon", "sign"]);
}
