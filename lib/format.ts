/** Formats an integer paise amount as a ₹ string, e.g. 20000 -> "₹200", 4950 -> "₹49.50". */
export function formatRupees(paise: number | null | undefined): string {
  const rupees = (paise ?? 0) / 100;
  if (!Number.isFinite(rupees)) return "₹0";
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}
