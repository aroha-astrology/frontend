/**
 * Splits a spelling variant against its current name into [unchanged prefix, changed middle,
 * unchanged suffix] by walking in from both ends — so the variant card can highlight only the
 * letters that actually differ (e.g. "Priya" -> "Priyaa" highlights just the trailing "a"). No
 * diff library: name_change's variants are always small single-edit changes (see
 * generateDeterministicVariants on the backend), so a common-prefix/common-suffix walk is enough.
 */
export function diffNameParts(current: string, variant: string): [string, string, string] {
  let start = 0;
  const maxStart = Math.min(current.length, variant.length);
  while (start < maxStart && current[start] === variant[start]) start++;

  let endCurrent = current.length;
  let endVariant = variant.length;
  while (
    endCurrent > start &&
    endVariant > start &&
    current[endCurrent - 1] === variant[endVariant - 1]
  ) {
    endCurrent--;
    endVariant--;
  }

  return [variant.slice(0, start), variant.slice(start, endVariant), variant.slice(endVariant)];
}
