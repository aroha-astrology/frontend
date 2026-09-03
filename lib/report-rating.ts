const RATED_KEY = "aroha:ratedReports:v1";

/**
 * Whether this report has already had a rating submitted from this device —
 * so the scroll+back trigger on the report page doesn't re-arm on a later
 * visit. Purely a UX nicety: the real guard against rating (and refunding)
 * the same report twice is the backend's unique(user_id, report_id)
 * constraint, not this — localStorage is trivially cleared.
 */
export function hasRatedReport(reportId: string): boolean {
  try {
    const raw = window.localStorage.getItem(RATED_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) && ids.includes(reportId);
  } catch {
    return false;
  }
}

export function markReportRated(reportId: string): void {
  try {
    const raw = window.localStorage.getItem(RATED_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(ids) ? (ids as string[]) : [];
    if (!list.includes(reportId)) {
      window.localStorage.setItem(RATED_KEY, JSON.stringify([...list, reportId]));
    }
  } catch {
    // localStorage unavailable — the modal may re-arm next visit, harmless.
  }
}
