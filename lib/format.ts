/** Formats an integer paise amount as a ₹ string, e.g. 20000 -> "₹200", 4950 -> "₹49.50". */
export function formatRupees(paise: number | null | undefined): string {
  const rupees = (paise ?? 0) / 100;
  if (!Number.isFinite(rupees)) return "₹0";
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}

/** Formats a "HH:mm[:ss]" string for display (e.g. "02:30 PM"). */
export function formatTimeOfBirth(hhmmss: string | null | undefined): string {
  if (!hhmmss) return "";
  const [h, m] = hhmmss.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmmss;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
